// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { emitUserJoined, emitUserLeft } = require("./system-messages-server");

const cookieParser = require("cookie-parser");
const crypto = require("crypto");

// 2-Minuten-Timeout
const AWAY_TIMEOUT = 1000 * 120;

// sessionId -> { username, gender }
const sessions = {};

// sessionId -> { username, gender, lastActive, away, timeoutHandle }
const userStates = {};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Helper
// --------------------------------------------------
function findSessionIdByUsername(username) {
  return Object.keys(sessions).find(
    (sid) => sessions[sid].username === username
  );
}

// --------------------------------------------------
// LOGIN ENDPOINT
// --------------------------------------------------
app.post("/login", (req, res) => {
  const { username, gender } = req.body;

  if (!username || !gender) {
    return res.redirect("/");
  }

  const sessionId = crypto.randomUUID();
  sessions[sessionId] = { username, gender };

  userStates[sessionId] = {
    username,
    gender,
    lastActive: Date.now(),
    away: false,
    timeoutHandle: null,
  };

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: false, // wichtig: kein HTTPS-Zwang im Dev
  });

  // Fallback sid in URL (für Fälle, wo Cookie beim ersten Redirect zickt)
  res.redirect(`/chat?sid=${sessionId}`);
});

// --------------------------------------------------
// ROOT "/" – entscheidet Login vs. ReLogin vs. direkt Chat
// --------------------------------------------------
app.get("/", (req, res) => {
  const sid = req.cookies.sessionId;

  // keine Session → normaler Login
  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.sendFile(path.join(__dirname, "login.html"));
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;

  // innerhalb der 2 Minuten im Away-Status → ReLogin-Screen
  if (state.away && diff < AWAY_TIMEOUT) {
    return res.sendFile(path.join(__dirname, "relogin.html"));
  }

  // Session da, nicht away → direkt in den Chat
  return res.redirect("/chat");
});

// --------------------------------------------------
// CHAT – geschützt, behandelt ReLogin
// --------------------------------------------------
app.get("/chat", (req, res) => {
  // Cookie oder Fallback-Query
  const sid = req.cookies.sessionId || req.query.sid;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.redirect("/");
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;

  // Wenn noch in der 2-Minuten-Away-Phase → ReLogin-Screen
  if (state.away && diff < AWAY_TIMEOUT) {
    return res.sendFile(path.join(__dirname, "relogin.html"));
  }

  // wenn Cookie noch nicht gesetzt war, jetzt nachziehen
  if (!req.cookies.sessionId) {
    res.cookie("sessionId", sid, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
  }

  // aktiver Chatbesuch → nicht mehr away
  state.away = false;
  state.lastActive = Date.now();
  if (state.timeoutHandle) {
    clearTimeout(state.timeoutHandle);
    state.timeoutHandle = null;
  }

  res.sendFile(path.join(__dirname, "chat.html"));
});

// Direkter Zugriff auf chat.html verhindern
app.get("/chat.html", (req, res) => {
  res.redirect("/chat");
});

// --------------------------------------------------
// /relogin – optionaler direkter Endpunkt
// --------------------------------------------------
app.get("/relogin", (req, res) => {
  const sid = req.cookies.sessionId;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.redirect("/");
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;

  if (!(state.away && diff < AWAY_TIMEOUT)) {
    // keine gültige Grace-Period mehr → normaler Flow
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "relogin.html"));
});

// --------------------------------------------------
// /me – liefert Login- und Away-Status
// --------------------------------------------------
app.get("/me", (req, res) => {
  const sid = req.cookies.sessionId || req.query.sid;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.json({ loggedIn: false });
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;
  const away = state.away && diff < AWAY_TIMEOUT;

  res.json({
    loggedIn: true,
    username: state.username,
    gender: state.gender,
    away,
  });
});

// --------------------------------------------------
// User-Map: socket.id -> { username, gender }
// --------------------------------------------------
const users = new Map();

function getUserList() {
  return Array.from(users.values()).map((u) => {
    const sid = findSessionIdByUsername(u.username);
    let away = false;

    if (sid && userStates[sid]) {
      const st = userStates[sid];
      const diff = Date.now() - st.lastActive;
      away = st.away && diff < AWAY_TIMEOUT;
    }

    return {
      username: u.username,
      gender: u.gender,
      away,
    };
  });
}

// --------------------------------------------------
// SOCKET.IO
// --------------------------------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // USER REGISTER
  socket.on("register-user", ({ username, gender }) => {
    const cleanName = (username || "Gast").toString().slice(0, 30);

    users.set(socket.id, {
      username: cleanName,
      gender: gender || "",
    });

    console.log("User registered:", socket.id, cleanName);

    // ReLogin-Erkennung
    const sid = findSessionIdByUsername(cleanName);
    if (sid && userStates[sid]) {
      const state = userStates[sid];
      const diff = Date.now() - state.lastActive;

      state.lastActive = Date.now();

      if (state.away && diff < AWAY_TIMEOUT) {
        // ReLogin innerhalb der Grace-Period → KEIN Join
        state.away = false;
        if (state.timeoutHandle) {
          clearTimeout(state.timeoutHandle);
          state.timeoutHandle = null;
        }
      } else {
        // normaler (neuer) Beitritt → Join-Nachricht
        state.away = false;
        emitUserJoined(io, cleanName);
      }
    } else {
      // Fallback, falls kein userState gefunden wird
      emitUserJoined(io, cleanName);
    }

    io.emit("user-list", getUserList());
  });

  // CHAT MESSAGE
  socket.on("chat-message", (data) => {
    const user = users.get(socket.id);
    const text = (data?.text || "").toString().trim();
    if (!text) return;

    const username = user?.username || "User";

    socket.broadcast.emit("chat-message", {
      text,
      username,
    });
  });

  // DISCONNECT → AWAY SYSTEM
  socket.on("disconnect", () => {
    const user = users.get(socket.id);

    if (user) {
      const sessionId = findSessionIdByUsername(user.username);

      if (sessionId && userStates[sessionId]) {
        const state = userStates[sessionId];
        state.away = true;
        state.lastActive = Date.now();

        // leave verzögert senden
        state.timeoutHandle = setTimeout(() => {
          const diff = Date.now() - state.lastActive;
          if (state.away && diff >= AWAY_TIMEOUT) {
            emitUserLeft(io, user.username);

            // nach endgültigem Leave Session entfernen
            delete userStates[sessionId];
            delete sessions[sessionId];
          }
        }, AWAY_TIMEOUT);
      }
    }

    users.delete(socket.id);
    io.emit("user-list", getUserList());
    console.log("Client disconnected:", socket.id);
  });
});

// STATIC
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const auth = require("./auth-server");

const { emitUserJoined, emitUserLeft } = require("./system-messages-server");
const { ROOMS, findRoom, getRoomsForClient } = require("./rooms-server");

const { getUserRole } = require("./roles-server");
// 2-Minuten-Timeout
const AWAY_TIMEOUT = 1000 * 120;

// sessionId -> { username, gender }
const sessions = {};

// sessionId -> { username, gender, lastActive, away, timeoutHandle, currentRoom }
const userStates = {};

// socket.id -> { username, gender, away, currentRoom }
const users = new Map();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Helper
// --------------------------------------------------
function findSessionIdByUsername(username) {
  return Object.keys(sessions).find((sid) => sessions[sid].username === username);
}

// --------------------------------------------------
// LOGIN ENDPOINT
// --------------------------------------------------
app.post("/login", (req, res) => {
  const { username, gender, password } = req.body;

  const cleanName = (username || "").toString().trim();

  if (!cleanName || !gender) {
    return res.redirect("/");
  }

  // Standardmäßig nehmen wir die Eingabe
  let effectiveName = cleanName;

  // Wenn Name registriert ist → Passwort prüfen
  if (auth.isRegistered(cleanName)) {
    if (!password || !auth.verifyPassword(cleanName, password)) {
      // Falsches oder fehlendes Passwort → zurück auf Login mit Fehlermeldung
      return res.redirect(
        "/?loginError=pw&username=" + encodeURIComponent(cleanName)
      );
    }

    // Ab hier IMMER die bei der Registrierung gespeicherte Schreibweise verwenden
    effectiveName = auth.getCanonicalUsername(cleanName);
  }

  const sessionId = crypto.randomUUID();
  sessions[sessionId] = { username: effectiveName, gender };

  userStates[sessionId] = {
    username: effectiveName,
    gender,
    lastActive: Date.now(),
    away: false,
    timeoutHandle: null,
    currentRoom: "lobby",
  };

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
  });

  res.redirect(`/chat?sid=${sessionId}`);
});

// --------------------------------------------------
// Prüfen, ob Username bereits registriert ist
// --------------------------------------------------
app.get("/check-username", (req, res) => {
  const name = (req.query.username || "").toString().trim();
  if (!name) {
    return res.json({ registered: false });
  }
  return res.json({ registered: auth.isRegistered(name) });
});

// --------------------------------------------------
// ROOT "/" – entscheidet Login vs. ReLogin vs. direkt Chat
// --------------------------------------------------
app.get("/", (req, res) => {
  const sid = req.cookies.sessionId;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.sendFile(path.join(__dirname, "login.html"));
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;

  if (state.away && diff < AWAY_TIMEOUT) {
    return res.sendFile(path.join(__dirname, "relogin.html"));
  }

  return res.redirect("/chat");
});

// --------------------------------------------------
// CHAT – geschützt, behandelt ReLogin
// --------------------------------------------------
app.get("/chat", (req, res) => {
  const sid = req.cookies.sessionId || req.query.sid;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.redirect("/");
  }

  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;
  const fromRelogin = req.query.relogin === "1";

  if (state.away && diff < AWAY_TIMEOUT && !fromRelogin) {
    return res.sendFile(path.join(__dirname, "relogin.html"));
  }

  // Cookie setzen falls nötig
  if (!req.cookies.sessionId) {
    res.cookie("sessionId", sid, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
    });
  }

  res.sendFile(path.join(__dirname, "chat.html"));
});

// Direkter Zugriff auf chat.html verhindern
app.get("/chat.html", (req, res) => {
  res.redirect("/chat");
});

// --------------------------------------------------
// ReLogin-Seite
// --------------------------------------------------
app.get("/relogin", (req, res) => {
  const sid = req.cookies.sessionId;
  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.redirect("/");
  }
  const state = userStates[sid];
  const diff = Date.now() - state.lastActive;

  if (!(state.away && diff < AWAY_TIMEOUT)) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "relogin.html"));
});

// --------------------------------------------------
// Logout
// --------------------------------------------------
app.get("/logout", (req, res) => {
  const sid = req.cookies.sessionId;

  if (sid && userStates[sid]) {
    const { username, timeoutHandle } = userStates[sid];

    if (timeoutHandle) clearTimeout(timeoutHandle);

    emitUserLeft(io, username);
    delete userStates[sid];
    delete sessions[sid];
  }

  res.clearCookie("sessionId");

  io.emit("user-list", []);
  return res.redirect("/");
});

// --------------------------------------------------
// /me
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
// Profil: aktuellen Benutzernamen mit Passwort schützen
// --------------------------------------------------
app.post("/register-username", (req, res) => {
  const sid = req.cookies.sessionId;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.status(401).json({ ok: false, error: "NOT_LOGGED_IN" });
  }

  const { password } = req.body;
  const session = sessions[sid];

  if (!password || String(password).length < 4) {
    return res
      .status(400)
      .json({ ok: false, error: "PASSWORD_WEAK" });
  }

  const result = auth.registerUser(session.username, password);
  if (!result.ok) {
    return res.status(400).json(result);
  }

  return res.json({ ok: true });
});

// --------------------------------------------------
// Userliste nach Raum
// roomId = null  -> alle User
// roomId = "lobby" / "staff" etc. -> nur diese User
// --------------------------------------------------
function getUserList() {
  const list = [];
  users.forEach((u) => {
    list.push({
      username: u.username,
      gender: u.gender,
      away: u.away,
      role: u.role,
      room: u.currentRoom   // wichtig!
    });
  });
  return list;
}

// --------------------------------------------------
// Raum-Infos + Userlisten
// --------------------------------------------------
function broadcastRoomState(io) {
  const counts = {};

  users.forEach((user) => {
    const roomId = user.currentRoom || "lobby";
    counts[roomId] = (counts[roomId] || 0) + 1;
  });

  // Raumliste
  io.emit("room-list", getRoomsForClient(counts));

  // **Globale Userliste für ALLE Kunden**
  io.emit("user-list", getUserList(null));
}

// --------------------------------------------------
// SOCKET.IO
// --------------------------------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // REGISTER USER
  socket.on("register-user", ({ username, gender }) => {
    const cleanName = (username || "Gast").toString().slice(0, 30);

    users.set(socket.id, {
  username: cleanName,
  gender: gender || "",
  away: false,
  currentRoom: "lobby",
  role: getUserRole(cleanName)
});

    socket.join("lobby");
    const sid = findSessionIdByUsername(cleanName);
    if (sid && userStates[sid]) {
      const state = userStates[sid];
      state.away = false;
      state.lastActive = Date.now();
    }

    socket.emit("room-changed", { roomId: "lobby" });
    broadcastRoomState(io);
    emitUserJoined(io, cleanName);
  });

  // --------------------------------------------------
// Profil-Info: Hat aktueller User ein Passwort?
// --------------------------------------------------
app.get("/profile-info", (req, res) => {
  const sid = req.cookies.sessionId;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.status(401).json({ ok: false, error: "NOT_LOGGED_IN" });
  }

  const session = sessions[sid];
  const hasPw = auth.hasPassword(session.username);

  return res.json({ ok: true, hasPassword: hasPw });
});

// --------------------------------------------------
// Profil: Passwort im Klartext anzeigen
// --------------------------------------------------
app.post("/profile-show-password", (req, res) => {
  const sid = req.cookies.sessionId;

  if (!sid || !sessions[sid] || !userStates[sid]) {
    return res.status(401).json({ ok: false, error: "NOT_LOGGED_IN" });
  }

  const session = sessions[sid];
  const pw = auth.getPlainPassword(session.username);

  if (!pw) {
    return res.status(404).json({ ok: false, error: "NO_PASSWORD" });
  }

  return res.json({ ok: true, password: pw });
});

  // JOIN ROOM
  socket.on("join-room", ({ roomId, password }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const room = findRoom(roomId);
    if (!room) return socket.emit("join-room-error", { message: "Raum existiert nicht." });

    if (room.type === "locked") {
    const role = user.role || "USER";

    const TEAM = ["INHABER", "ADMIN", "TEAMLEITER", "MOD", "JUNIOR MOD"];

    // Team-Mitglieder dürfen locked Räume betreten
    if (!TEAM.includes(role)) {
        return socket.emit("join-room-error", { message: "Dieser Raum ist verschlossen." });
    }
}

    if (room.type === "private") {
      if (!room.password || room.password !== password) {
        return socket.emit("join-room-error", { message: "Falsches Passwort." });
      }
    }

    const oldRoomId = user.currentRoom;

    socket.leave(oldRoomId);
    socket.join(room.id);

    user.currentRoom = room.id;

    socket.emit("room-changed", { roomId: room.id });
    broadcastRoomState(io);
  });

  // CHAT MESSAGE
  socket.on("chat-message", (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const text = (data && data.text ? String(data.text) : "").trim();
    if (!text) return;

    const roomId = user.currentRoom || "lobby";

    // nur an die anderen im Raum schicken, nicht an den Sender selbst
    socket.to(roomId).emit("chat-message", {
      username: user.username,
      text,
    });
  });

    // DISCONNECT
  socket.on("disconnect", () => {
  const user = users.get(socket.id);

  if (!user) return;

  const sessionId = findSessionIdByUsername(user.username);

  if (sessionId && userStates[sessionId]) {
    const state = userStates[sessionId];

    state.away = true;
    state.lastActive = Date.now();

    state.timeoutHandle = setTimeout(() => {
      const diff = Date.now() - state.lastActive;

      if (state.away && diff >= AWAY_TIMEOUT) {
        emitUserLeft(io, user.username);

        delete userStates[sessionId];
        delete sessions[sessionId];

        // << HIER und NUR HIER löschen
        users.delete(socket.id);
      }

      broadcastRoomState(io);
    }, AWAY_TIMEOUT);
  }

  broadcastRoomState(io);
});
});

// STATIC
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
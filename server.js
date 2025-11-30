const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { emitUserJoined, emitUserLeft } = require("./system-messages-server");

const cookieParser = require("cookie-parser");
const crypto = require("crypto");

// sessionId -> { username, gender, lastActive, away, timeoutHandle }
const userStates = {};
const AWAY_TIMEOUT = 1000 * 120; // 2 Minuten

const sessions = {}; // sessionId -> { username, gender }

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// LOGIN ENDPOINT
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
    timeoutHandle: null
  };

  res.cookie("sessionId", sessionId, {
  httpOnly: true,
  sameSite: "strict",
  secure: false   // oder ganz weglassen
});

  res.redirect("/chat");
});

// LOGIN-SEITE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// LOGIN-SCHUTZ
app.get("/chat", (req, res) => {
  const sid = req.cookies.sessionId;
  if (!sid || !sessions[sid]) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "chat.html"));
});

// chat.html verhindern
app.get("/chat.html", (req, res) => {
  res.redirect("/chat");
});

// /me Endpoint (für client.js)
app.get("/me", (req, res) => {
  const sid = req.cookies.sessionId;
  if (!sid || !sessions[sid]) {
    return res.json({ username: "Gast", gender: "none" });
  }

  res.json(sessions[sid]);
});

// User-Map: socket.id -> userObject
const users = new Map();

function getUserList() {
  return Array.from(users.values());
}

// SOCKET.IO
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // USER REGISTER
  socket.on("register-user", ({ username, gender }) => {
    const cleanName = (username || "Gast").toString().slice(0, 30);

    users.set(socket.id, {
      username: cleanName,
      gender: gender || "",
      away: false
    });

    console.log("User registered:", socket.id, cleanName);

    io.emit("user-list", getUserList());

    // ⚠️ später angepasst für ReLogin-Logik
    emitUserJoined(io, cleanName);
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
      const sessionId = Object.keys(sessions).find(
        sid => sessions[sid].username === user.username
      );

      if (sessionId && userStates[sessionId]) {
        userStates[sessionId].away = true;
        userStates[sessionId].lastActive = Date.now();

        // leave verzögert senden
        userStates[sessionId].timeoutHandle = setTimeout(() => {
          if (userStates[sessionId].away) {
            emitUserLeft(io, user.username);
          }
        }, AWAY_TIMEOUT);
      }
    }

    users.delete(socket.id);
    io.emit("user-list", getUserList());
  });
});

// STATIC
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

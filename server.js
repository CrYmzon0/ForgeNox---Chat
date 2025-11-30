const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// eigenes Modul für Systemnachrichten
const { emitUserJoined, emitUserLeft } = require("./system-messages-server");

// NEU: Richtige Reihenfolge – require oben, use unten
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// NEU: App existiert → jetzt cookieParser & urlencoded aktivieren
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Sessionspeicher
const sessions = {}; // sessionId -> { username, gender }

// LOGIN ENDPOINT
app.post("/login", (req, res) => {
  const { username, gender } = req.body;

  if (!username || !gender) {
    return res.redirect("/");
  }

  const sessionId = crypto.randomUUID();
  sessions[sessionId] = { username, gender };

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: true
  });

  res.redirect("/chat");
});

// 🚨 WICHTIG: Login-Seite – vor static
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// 🚨 WICHTIG: LOGIN-SCHUTZ – vor static
app.get("/chat", (req, res) => {
  if (!req.cookies || !req.cookies.sessionId || !sessions[req.cookies.sessionId]) {
    return res.redirect("/");
  }

  res.sendFile(path.join(__dirname, "chat.html"));
});

// 🚨 WICHTIG: chat.html blockieren – vor static
app.get("/chat.html", (req, res) => {
  res.redirect("/chat");
});

// User-Map: socket.id -> { username, gender }
const users = new Map();

function getUserList() {
  return Array.from(users.values());
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register-user", ({ username, gender }) => {
    const cleanName = (username || "Gast").toString().slice(0, 30);

    users.set(socket.id, {
      username: cleanName,
      gender: gender || "",
    });

    console.log("User registered:", socket.id, cleanName);

    io.emit("user-list", getUserList());
    emitUserJoined(io, cleanName);
  });

  socket.on("chat-message", (data) => {
    const user = users.get(socket.id);
    const text = (data && data.text ? data.text : "").toString().trim();
    if (!text) return;

    const username = user?.username || "User";

    socket.broadcast.emit("chat-message", {
      text,
      username,
    });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);

    if (user) {
      emitUserLeft(io, user.username);

      users.delete(socket.id);
      io.emit("user-list", getUserList());
    }

    console.log("Client disconnected:", socket.id);
  });
});

// /me Endpoint
app.get("/me", (req, res) => {
  const { sessionId } = req.cookies;
  if (!sessionId || !sessions[sessionId]) {
    return res.json({ username: "Gast", gender: "none" });
  }

  res.json(sessions[sessionId]);
});

// 🚨 GANZ ZUM SCHLUSS: static-Serving
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

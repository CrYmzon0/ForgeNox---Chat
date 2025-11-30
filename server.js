const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien aus dem aktuellen Verzeichnis ausliefern
app.use(express.static(__dirname));

// Standardroute -> Login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// User-Map: socket.id -> { username, gender }
const users = new Map();

function getUserList() {
  // gibt ein Array wie [{ username: 'Max', gender: 'male' }, ...] zurück
  return Array.from(users.values());
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Wenn sich ein Client registriert (kommt aus client.js -> socket.emit("register-user", ...))
  socket.on("register-user", ({ username, gender }) => {
    const cleanName = (username || "Gast").toString().slice(0, 30);

    users.set(socket.id, {
      username: cleanName,
      gender: gender || "",
    });

    console.log("User registered:", socket.id, cleanName);

    // aktualisierte Userliste an alle senden
    io.emit("user-list", getUserList());
  });

  // Chat-Nachricht eines Clients
  socket.on("chat-message", (data) => {
  const user = users.get(socket.id);
  const text = (data && data.text ? data.text : "").toString().trim();
  if (!text) return;

  const username = user?.username || "User";
  const time = new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Nur an die anderen Clients senden (nicht an den Sender)
  socket.broadcast.emit("chat-message", {
    text,
    username,
    time,
  });
});

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    users.delete(socket.id);

    // Userliste nach Entfernen aktualisieren
    io.emit("user-list", getUserList());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

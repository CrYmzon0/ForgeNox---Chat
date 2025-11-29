const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien direkt aus dem gleichen Ordner ausliefern
app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("Client verbunden:", socket.id);

  // Raum betreten
  socket.on("joinRoom", (room, username) => {
    if (!room) room = "lobby";
    socket.join(room);
    socket.data.room = room;
    socket.data.username = username || "Gast";

    socket.to(room).emit("systemMessage", {
      message: `${socket.data.username} hat den Raum betreten.`,
      ts: Date.now(),
    });
  });

  // Chatnachricht im Raum senden
  socket.on("chatMessage", (text) => {
    const room = socket.data.room || "lobby";
    const username = socket.data.username || "Gast";

    if (!text || !text.trim()) return;

    io.to(room).emit("chatMessage", {
      user: username,
      message: text.trim(),
      ts: Date.now(),
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const room = socket.data.room;
    const username = socket.data.username;

    if (room && username) {
      socket.to(room).emit("systemMessage", {
        message: `${username} hat den Raum verlassen.`,
        ts: Date.now(),
      });
    }

    console.log("Client getrennt:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server läuft auf http://localhost:3000");
});

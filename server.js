const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien direkt aus dem aktuellen Verzeichnis
app.use(express.static(__dirname));

// Optional: Standardroute auf login.html oder chat.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html')); // oder 'chat.html'
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('chat-message', (data) => {
    // an alle anderen senden
    socket.broadcast.emit('chat-message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

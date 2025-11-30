// system-messages-server.js
// Kapselt die Logik für Join/Leave-Systemnachrichten

function emitUserJoined(io, username) {
  io.emit("system-message", {
    text: `${username} hat den Chat betreten.`,
    type: "join",
  });
}

function emitUserLeft(io, username) {
  io.emit("system-message", {
    text: `${username} hat den Chat verlassen.`,
    type: "leave",
  });
}

module.exports = {
  emitUserJoined,
  emitUserLeft,
};

// rooms-server.js
// --------------------------------------------------
// Zentrale Raum-Konfiguration
// HIER pflegst du später deine Räume
// --------------------------------------------------

const ROOMS = [
  {
    id: "lobby",
    name: "Hauptlobby",
    type: "public",
  },
  {
    id: "vip",
    name: "VIP-Lounge",
    type: "private",
    password: "vip123", // nur Beispiel
  },
  {
    id: "staff",
    name: "Backstage",
    type: "locked",
  },
];

// Hilfsfunktionen
function findRoom(roomId) {
  return ROOMS.find((r) => r.id === roomId) || null;
}

// Liste ohne Passwörter an Clients schicken
function getRoomsForClient(userCounts = {}) {
  return ROOMS.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    userCount: userCounts[r.id] || 0,
  }));
}

module.exports = {
  ROOMS,
  findRoom,
  getRoomsForClient,
};

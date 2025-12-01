// rooms-client.js
// Steuert die Anzeige der Räume rechts + Klick-Verhalten

(function () {
  const socket = window.socket || io();

  window.addEventListener("DOMContentLoaded", () => {
    const roomListEl = document.getElementById("roomList");
    const roomTitleEl = document.querySelector("[data-room-title]");
    let currentRoomId = null;
    let rooms = [];

    if (!roomListEl) return;

    // --------------------------------------------------
    // Räume rendern
    // --------------------------------------------------
    function renderRooms() {
      roomListEl.innerHTML = "";

      rooms.forEach((room) => {
        const li = document.createElement("li");
        li.classList.add("fn-room");

        li.dataset.roomId = room.id;
        li.dataset.roomType = room.type;

        // Typ-spezifische Klasse
        li.classList.add(`fn-room--${room.type}`);
        if (room.id === currentRoomId) {
          li.classList.add("fn-room--active");
        }

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("fn-room-name");
        nameSpan.textContent = room.name;

        const countSpan = document.createElement("span");
        countSpan.classList.add("fn-room-count");
        countSpan.textContent = room.userCount != null ? `${room.userCount}` : "0";

        li.appendChild(nameSpan);
        li.appendChild(countSpan);

        roomListEl.appendChild(li);
      });
    }

    // --------------------------------------------------
    // Socket-Events
    // --------------------------------------------------

    // Raumliste vom Server
    socket.on("room-list", (serverRooms) => {
      rooms = Array.isArray(serverRooms) ? serverRooms : [];
      renderRooms();
    });

    // Aktueller Raum wurde geändert
    socket.on("room-changed", ({ roomId }) => {
      currentRoomId = roomId;
      renderRooms();

      if (roomTitleEl && roomId) {
        const room = rooms.find((r) => r.id === roomId);
        if (room) {
          roomTitleEl.textContent = room.name;
        }
      }
    });

    // Optional: Fehler beim Joinen anzeigen
    socket.on("join-room-error", (data) => {
      if (!data || !data.message) return;
      // Für den Anfang simples alert; später eigenes Toast-System
      alert(data.message);
    });

    // --------------------------------------------------
    // Klick auf Räume
    // --------------------------------------------------
    roomListEl.addEventListener("click", (event) => {
      const li = event.target.closest(".fn-room");
      if (!li) return;

      const roomId = li.dataset.roomId;
      const roomType = li.dataset.roomType;

      if (!roomId || !roomType) return;

      if (roomType === "locked") {
        // verschlossener Raum: erstmal nichts machen
        // (Fehlermeldung kommt ggf. vom Server)
        socket.emit("join-room", { roomId });
        return;
      }

      if (roomType === "private") {
        const pwd = window.prompt(`Passwort für Raum "${li.textContent.trim()}" eingeben:`);
        if (!pwd) return;

        socket.emit("join-room", { roomId, password: pwd });
        return;
      }

      // public
      socket.emit("join-room", { roomId });
    });
  });
})();

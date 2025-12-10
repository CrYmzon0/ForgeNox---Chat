// rooms-client.js
// Räume rendern

(function () {
  const socket = window.socket || io();

  window.addEventListener("DOMContentLoaded", () => {
    const roomListEl = document.getElementById("roomList");
    const userListEl = document.getElementById("userList"); // bleibt, wird aber hier nicht benutzt
    const roomTitleEl = document.querySelector("[data-room-title]");

    if (!roomListEl || !userListEl) return;

    let rooms = [];
    let currentRoomId = "lobby";

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

        li.classList.add(`fn-room--${room.type}`);
        if (room.id === currentRoomId) {
          li.classList.add("fn-room--active");
        }

        const header = document.createElement("div");
        header.classList.add("fn-room-header");

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("fn-room-name");
        nameSpan.textContent = room.name;

        const countSpan = document.createElement("span");
        countSpan.classList.add("fn-room-count");
        countSpan.textContent =
          typeof room.userCount === "number" ? room.userCount : 0;

        header.appendChild(nameSpan);
        header.appendChild(countSpan);
        li.appendChild(header);

        roomListEl.appendChild(li);
      });
    }

    // --------------------------------------------------
    // Socket-Events
    // --------------------------------------------------

    // Raumliste vom Server
    socket.on("room-list", (roomsFromServer) => {
      rooms = Array.isArray(roomsFromServer) ? roomsFromServer : [];
      renderRooms();
    });

    // Aktueller Raum hat sich geändert
    socket.on("room-changed", ({ roomId }) => {
      currentRoomId = roomId;
      window.currentRoomId = roomId; // für andere Scripts, falls nötig
      renderRooms();

      if (roomTitleEl) {
        const room = rooms.find((r) => r.id === roomId);
        if (room) {
          roomTitleEl.textContent = room.name;
        }
      }
    });

    socket.on("join-room-error", (data) => {
      if (!data || !data.message) return;
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
        socket.emit("join-room", { roomId });
        return;
      }

      if (roomType === "private") {
        const nameEl = li.querySelector(".fn-room-name");
        const label = nameEl ? nameEl.textContent.trim() : roomId;
        const pwd = window.prompt(`Passwort für Raum "${label}" eingeben:`);
        if (!pwd) return;

        socket.emit("join-room", { roomId, password: pwd });
        return;
      }

      // public
      socket.emit("join-room", { roomId });
    });
  });
})();

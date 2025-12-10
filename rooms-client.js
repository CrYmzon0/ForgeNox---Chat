(function () {
  const socket = window.socket || io();

  window.addEventListener("DOMContentLoaded", () => {
    const roomListEl = document.getElementById("roomList");
    if (!roomListEl) return;

    let rooms = [];
    let users = [];
    let currentRoomId = "lobby";

    // --------------------------------------------------
    // Räume + zugehörige User rendern
    // --------------------------------------------------
    function renderRooms() {
      roomListEl.innerHTML = "";

      rooms.forEach(room => {
        const li = document.createElement("li");
        li.classList.add("fn-room");
        li.dataset.roomId = room.id;
        li.dataset.roomType = room.type;

        if (room.id === currentRoomId) {
          li.classList.add("fn-room--active");
        }

        // Header
        const header = document.createElement("div");
        header.classList.add("fn-room-header");

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("fn-room-name");
        nameSpan.textContent = room.name;

        const countSpan = document.createElement("span");
        countSpan.classList.add("fn-room-count");
        countSpan.textContent = room.userCount || 0;

        header.appendChild(nameSpan);
        header.appendChild(countSpan);
        li.appendChild(header);

        // Userliste in diesem Raum
        const ul = document.createElement("ul");
        ul.classList.add("fn-room-userlist");

        const roomUsers = users.filter(u => u.room === room.id);

        if (roomUsers.length === 0) {
          const empty = document.createElement("li");
          empty.textContent = "— keine User —";
          ul.appendChild(empty);
        } else {
          roomUsers.forEach(u => {
            const userLi = document.createElement("li");
            userLi.textContent = u.username;

            if (u.role && u.role !== "USER") {
              const img = document.createElement("img");
              img.src = `/BADGES/${u.role} - BADGE.png`;
              img.classList.add("fn-role-badge");
              userLi.appendChild(img);
            }

            ul.appendChild(userLi);
          });
        }

        li.appendChild(ul);
        roomListEl.appendChild(li);
      });
    }

    // --------------------------------------------------
    // Socket Events
    // --------------------------------------------------

    socket.on("room-list", (roomsFromServer) => {
      rooms = roomsFromServer || [];
      renderRooms();
    });

    socket.on("user-list", (usersFromServer) => {
      users = usersFromServer || [];
      renderRooms();
    });

    socket.on("room-changed", ({ roomId }) => {
      currentRoomId = roomId;
      renderRooms();
    });

    // --------------------------------------------------
    // Räume anklicken
    // --------------------------------------------------
    roomListEl.addEventListener("click", (event) => {
      const li = event.target.closest(".fn-room");
      if (!li) return;

      const roomId = li.dataset.roomId;
      const roomType = li.dataset.roomType;

      if (roomType === "private") {
        const pwd = window.prompt("Passwort eingeben:");
        if (!pwd) return;
        socket.emit("join-room", { roomId, password: pwd });
        return;
      }

      socket.emit("join-room", { roomId });
    });
  });
})();
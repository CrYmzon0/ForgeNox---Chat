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
    li.classList.add("fn-room", `fn-room--${room.type}`);
    li.dataset.roomId = room.id;
    li.dataset.roomType = room.type;

    if (room.id === currentRoomId) {
      li.classList.add("fn-room--active");
    }

    // HEADER
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

    // USERLISTE
    const usersInRoom = (window.globalUsers || []).filter(
      u => u.room === room.id
    );

    if (usersInRoom.length > 0) {
      const ul = document.createElement("ul");
      ul.classList.add("fn-room-users");

      usersInRoom.forEach(u => {
        const userLi = document.createElement("li");
        userLi.classList.add("fn-room-user");

        const name = document.createElement("span");
        name.classList.add("fn-user-name");
        name.textContent = u.username;

        userLi.appendChild(name);

        if (u.role && u.role !== "USER") {
          const img = document.createElement("img");
          img.classList.add("fn-role-badge");
          img.src = `/BADGES/${u.role} - BADGE.png`;
          userLi.appendChild(img);
        }

        ul.appendChild(userLi);
      });

      li.appendChild(ul);
    }

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
    
    socket.on("join-room-error", (data) => {
    if (!data || !data.message) return;
    alert(data.message);  // oder ein eigenes Popup
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

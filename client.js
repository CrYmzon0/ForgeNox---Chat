// client.js

// globale Socket-Verbindung
window.socket = window.socket || io();
const socket = window.socket;

window.addEventListener("DOMContentLoaded", () => {
  // DOMs
  const messagesEl = document.getElementById("messages");
  const roomDisplayEl = document.getElementById("fn-current-room");
  const inputEl =
    document.getElementById("chatInput") ||
    document.querySelector(".fn-chat-input input");
  const sendBtn =
    document.getElementById("sendBtn") ||
    document.querySelector(".fn-chat-input button");
  const userSearchEl = document.getElementById("userSearch");
  const roomListEl = document.getElementById("roomList");
  const roomTitleEl = document.querySelector("[data-room-title]");

  let username = "";
  let gender = "";
  let persistentId = localStorage.getItem("fnx-id");
if (!persistentId) {
    persistentId = crypto.randomUUID();
    localStorage.setItem("fnx-id", persistentId);
}

  // globale Daten
  window.globalUsers = [];
  window.allRooms = [];
  let currentRoomId = "lobby";

  // ========================================
  // CHAT — Nachrichten anzeigen
  // ========================================
  function addMessage({ text, fromSelf = false, userName = "" }) {
    if (!messagesEl) return;

    const wrapper = document.createElement("div");
    wrapper.classList.add("fn-msg", fromSelf ? "fn-msg-me" : "fn-msg-other");

    const meta = document.createElement("div");
    meta.classList.add("fn-msg-meta");

    const displayName = userName || "User";
    const displayTime = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    meta.textContent = `${displayName} • ${displayTime}`;

    const bubble = document.createElement("div");
    bubble.classList.add("fn-msg-bubble");
    bubble.textContent = text;

    wrapper.appendChild(meta);
    wrapper.appendChild(bubble);

    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendMessage() {
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;

    addMessage({ text, fromSelf: true, userName: username });
    socket.emit("chat-message", { text });

    inputEl.value = "";
  }

  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ========================================
  // LOGIN-INFO holen und User registrieren
  // ========================================
  fetch("/me")
    .then((res) => res.json())
    .then((data) => {
      if (!data.loggedIn) {
        window.location.href = "/";
        return;
      }

      username = data.username || "Gast";
      gender = data.gender || "";
      window.currentUsername = username;

      socket.emit("register-user", { username, gender });
    });

  // ========================================
  // SERVER → globale Userliste
  // ========================================
    socket.on("user-list", (users) => {
    console.log("USERLIST:", users);
    window.globalUsers = users;
    renderRooms();
    applyAwayStyles();   // <-- NEU
  });

  // ========================================
// AWAY-STYLING direkt am DOM anwenden
// ========================================
function applyAwayStyles() {
  const users = window.globalUsers || [];
  const awayMap = new Map(users.map(u => [String(u.username || "").trim(), !!u.away]));

  document.querySelectorAll(".fn-room-user").forEach((li) => {
    const nameEl = li.querySelector(".fn-user-name");
    if (!nameEl) return;

    const nameText = nameEl.textContent.trim();
    const isAway = awayMap.get(nameText);

    if (isAway) {
      li.classList.add("fn-user-away");
      nameEl.style.color = "#888";
      nameEl.style.fontStyle = "italic";
      nameEl.style.opacity = "0.6";
    } else {
      li.classList.remove("fn-user-away");
      nameEl.style.color = "";
      nameEl.style.fontStyle = "";
      nameEl.style.opacity = "";
    }
  });
}

  // ========================================
  // SERVER → Raumliste
  // ========================================
    socket.on("room-list", (roomsFromServer) => {
  window.allRooms = Array.isArray(roomsFromServer) ? roomsFromServer : [];
  renderRooms();
  applyAwayStyles();
  updateRoomTitle(currentRoomId);
});

  // ========================================
  // Raumwechsel vom Server bestätigt
  // ========================================
    socket.on("room-changed", ({ roomId }) => {
  currentRoomId = roomId;
  renderRooms();
  applyAwayStyles();
  updateRoomTitle(roomId);
});

  // ========================================
  // RÄUME + User in den Räumen rendern
  // ========================================
  function renderRooms() {
    if (!roomListEl) return;
    roomListEl.innerHTML = "";

    const rooms = window.allRooms || [];
    const users = window.globalUsers || [];

    rooms.forEach((room) => {
      const li = document.createElement("li");
      li.classList.add("fn-room", `fn-room--${room.type}`);
      li.dataset.roomId = room.id;
      li.dataset.roomType = room.type;

      if (room.id === currentRoomId) {
        li.classList.add("fn-room--active");
      }

      function updateCurrentRoomDisplay(roomId) {
  if (!roomDisplayEl) return;

  // Namen des Raums herausfinden
  const room = (window.allRooms || []).find(r => r.id === roomId);
  if (!room) return;

  roomDisplayEl.textContent = room.name;
}

function updateRoomTitle(roomId) {
  if (!roomTitleEl) return;
  const room = (window.allRooms || []).find(r => r.id === roomId);
  if (!room) return;
  roomTitleEl.textContent = room.name;
}

  // ========================================
  // AWAY-STYLING direkt am DOM anwenden
  // ========================================
  function applyAwayStyles() {
    const users = window.globalUsers || [];
    const awayMap = new Map(users.map(u => [u.username, !!u.away]));

    // Alle User-Einträge im DOM durchgehen
    document.querySelectorAll(".fn-room-user").forEach((li) => {
      const nameEl = li.querySelector(".fn-user-name");
      if (!nameEl) return;

      const nameText = nameEl.textContent.trim();
      const isAway = awayMap.get(nameText);

      // Klasse setzen/entfernen
      if (isAway) {
        li.classList.add("fn-user-away");
        // harter Style, unabhängig vom CSS
        nameEl.style.color = "#888";
        nameEl.style.fontStyle = "italic";
        nameEl.style.opacity = "0.6";
      } else {
        li.classList.remove("fn-user-away");
        nameEl.style.color = "";
        nameEl.style.fontStyle = "";
        nameEl.style.opacity = "";
      }
    });
  }

      // ROOM HEADER
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

      // USER IN DIESEM RAUM
      const usersInRoom = users.filter((u) => u.room === room.id);

      if (usersInRoom.length > 0) {
        const ul = document.createElement("ul");
        ul.classList.add("fn-room-users");

        usersInRoom.forEach((u) => {
  const userLi = document.createElement("li");
  userLi.classList.add("fn-room-user");

  const name = document.createElement("span");
  name.classList.add("fn-user-name");
  name.textContent = u.username;

  // Away-Status → direkt stylen (unabhängig vom CSS)
  if (u.away) {
    userLi.classList.add("fn-user-away"); // falls du später CSS nutzen willst

    // Harter visueller Away-Look:
    name.style.color = "#888";
    name.style.fontStyle = "italic";
    name.style.opacity = "0.6";
  }

  userLi.appendChild(name);

  if (u.role && u.role !== "USER") {
    const img = document.createElement("img");
    img.classList.add("fn-role-badge");
    img.src = `/BADGES/${u.role} - BADGE.png`;
    img.alt = u.role;
    userLi.appendChild(img);
  }

  ul.appendChild(userLi);
});

        li.appendChild(ul);
      }

      roomListEl.appendChild(li);
    });
  }

  // ========================================
  // Raum anklicken → join-room senden
  // ========================================
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

  // ========================================
  // CHAT-NACHRICHTEN ANDERER USER
  // ========================================
  socket.on("chat-message", (data) => {
    addMessage({
      text: data.text,
      fromSelf: false,
      userName: data.username,
    });
  });
});

// client.js

// eine globale Socket-Verbindung für alle Scripts (wird auch von system-messages.js benutzt)
window.socket = window.socket || io();
const socket = window.socket;

window.addEventListener("DOMContentLoaded", () => {
  // DOM-Elemente
  const messagesEl = document.getElementById("messages");
  const inputEl =
    document.getElementById("chatInput") ||
    document.querySelector(".fn-chat-input input");
  const sendBtn =
    document.getElementById("sendBtn") ||
    document.querySelector(".fn-chat-input button");
  const userListEl = document.getElementById("userList");
  const userSearchEl = document.getElementById("userSearch");

  let username = "";
  let gender = "";
  let allUsers = [];

  // --------------------------------------------------
  // Nachricht im Chat anzeigen
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Nachricht an Server senden
  // --------------------------------------------------
  function sendMessage() {
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;

    addMessage({ text, fromSelf: true, userName: username });

    socket.emit("chat-message", { text });

    inputEl.value = "";
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // --------------------------------------------------
  // Login-Infos holen
  // --------------------------------------------------
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

      socket.emit("register-user", {
        username,
        gender,
      });
    });

  // --------------------------------------------------
  // USERLISTE + SUCHE + BADGES + AWAY
  // --------------------------------------------------

  // WICHTIG:
  // user-list bedeutet jetzt wieder: "ALLE User global"
  socket.on("user-list", (users) => {
    allUsers = users;
    updateUserCounter();
    renderUserList(allUsers);
  });

  function renderUserList(users) {
  if (!userListEl) return;

  userListEl.innerHTML = "";

  users.forEach(u => {
    const li = document.createElement("li");
    li.classList.add("fn-userlist-item");

    if (u.away) {
      li.classList.add("fn-user-away");
    }

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("fn-user-name");
    nameSpan.textContent = u.username;
    li.appendChild(nameSpan);

    if (u.role && u.role !== "USER") {
      const img = document.createElement("img");
      img.classList.add("fn-role-badge");
      img.src = `/BADGES/${u.role} - BADGE.png`;
      img.alt = u.role;
      li.appendChild(img);
    }

    userListEl.appendChild(li);
  }); 
  
}// Suche
  userSearchEl.addEventListener("input", () => {
    const term = userSearchEl.value.toLowerCase();

    if (!term) {
      renderUserList(allUsers);
      return;
    }

    const filtered = allUsers.filter((u) =>
      u.username.toLowerCase().includes(term)
    );

    renderUserList(filtered);
  });

  function updateUserCounter() {
    userSearchEl.placeholder = `User suchen (${allUsers.length} online)`;
  }

  // --------------------------------------------------
  // Chatnachrichten anderer User empfangen
  // --------------------------------------------------
  socket.on("chat-message", (data) => {
    addMessage({
      text: data.text,
      fromSelf: false,
      userName: data.username,
    });
  });

});

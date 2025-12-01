// client.js

// eine globale Socket-Verbindung für alle Scripts
window.socket = window.socket || io();
const socket = window.socket;

// DOM-Elemente
const messagesEl   = document.getElementById("messages");
const inputEl      = document.getElementById("chatInput");
const sendBtn      = document.getElementById("sendBtn");
const userListEl   = document.getElementById("userList");

// WICHTIG: Suchfeld explizit aus der Userlist-Box holen,
// damit NICHT das Chat-Eingabefeld unten betroffen ist.
const userSearchEl = document.querySelector(".fn-userlist-search input");

// Username & Gender (kommen vom Server über /me)
let username = "";
let gender = "";

// Lokale Kopie der aktuellen Userliste
let allUsers = [];

// --------------------------------------------------
// Nachricht im Chat anzeigen
// --------------------------------------------------
function addMessage({ text, fromSelf = false, userName = "" }) {
  if (!messagesEl) return; // falls Script bspw. auf login.html läuft

  const wrapper = document.createElement("div");
  wrapper.classList.add("fn-msg");
  wrapper.classList.add(fromSelf ? "fn-msg-me" : "fn-msg-other");

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

// Klick auf "Senden"
if (sendBtn) {
  sendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendMessage();
  });
}

// Enter zum Senden
if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

// --------------------------------------------------
// Username & Gender sicher vom Server holen
// --------------------------------------------------
fetch("/me")
  .then((res) => res.json())
  .then((data) => {
    if (!data.loggedIn) {
      // Fallback – sollte wegen /chat-Route eigentlich nicht auftreten
      window.location.href = "/";
      return;
    }

    username = data.username;
    gender = data.gender;

    // Registrierung erst NACH Login-Daten
    socket.emit("register-user", {
      username,
      gender,
    });
  });

// --------------------------------------------------
// Nachrichten von anderen empfangen
// --------------------------------------------------
socket.on("chat-message", (data) => {
  addMessage({
    text: data.text,
    fromSelf: false,
    userName: data.username,
  });
});

// --------------------------------------------------
// Userliste rendern + Suchlogik
// --------------------------------------------------
function renderUserList(filterText = "") {
  if (!userListEl) return;

  const q = filterText.trim().toLowerCase();
  let list = [...allUsers];

  if (q) {
    list.sort((a, b) => {
      const aMatch = a.username.toLowerCase().includes(q);
      const bMatch = b.username.toLowerCase().includes(q);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.username.localeCompare(b.username);
    });
  }

  userListEl.innerHTML = "";
  list.forEach((user) => {
    const li = document.createElement("li");
    li.classList.add("fn-userlist-item");
    li.textContent = user.username;

    if (user.away) {
      li.classList.add("fn-user-away");
    }

    userListEl.appendChild(li);
  });
}

// --------------------------------------------------
// Userliste vom Server + Online-Anzahl im User-Suchfeld
// --------------------------------------------------
socket.on("user-list", (users) => {
  allUsers = users || [];

  if (userSearchEl) {
    const onlineCount = allUsers.filter((u) => !u.away).length;
    userSearchEl.placeholder = `User suchen (${onlineCount} online)`;
  }

  const currentFilter = userSearchEl ? userSearchEl.value : "";
  renderUserList(currentFilter);
});

// --------------------------------------------------
// Live-Suche in der Userliste
// --------------------------------------------------
if (userSearchEl) {
  userSearchEl.addEventListener("input", () => {
    renderUserList(userSearchEl.value);
  });
}

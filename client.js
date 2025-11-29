// Verbindung zum Socket.IO-Server
const socket = io();

// DOM-Elemente
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const userListEl = document.getElementById("userList");

// Username/Geschlecht aus der URL (von login.html)
const params = new URLSearchParams(window.location.search);
let username = params.get("username") || "Gast";
let gender = params.get("gender") || "";

// Nachricht im Chat anzeigen
function addMessage({ text, fromSelf = false, userName = "", time = "" }) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("fn-msg");
  wrapper.classList.add(fromSelf ? "fn-msg-me" : "fn-msg-other");

  const meta = document.createElement("div");
  meta.classList.add("fn-msg-meta");

  const displayName = fromSelf ? "Du" : userName || "User";
  const displayTime =
    time ||
    new Date().toLocaleTimeString("de-DE", {
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

// Nachricht an Server senden
function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  // eigene Nachricht sofort anzeigen
  addMessage({ text, fromSelf: true, userName: username });

  // an Server schicken
  socket.emit("chat-message", { text });

  inputEl.value = "";
}

// Klick auf "Senden"
sendBtn.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

// Enter zum Senden
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// Beim Verbinden User registrieren
socket.emit("register-user", {
  username,
  gender,
});

// Nachrichten von anderen empfangen
socket.on("chat-message", (data) => {
  addMessage({
    text: data.text,
    fromSelf: false,
    userName: data.username,
    time: data.time,
  });
});

// Userliste aktualisieren
socket.on("user-list", (users) => {
  userListEl.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.classList.add("fn-userlist-item");
    li.textContent = user.username;
    userListEl.appendChild(li);
  });
});

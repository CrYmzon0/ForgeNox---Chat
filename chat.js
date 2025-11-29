// Verbindung zum Server aufbauen
const socket = io();

// Raum aus URL lesen ?room=xyz → fallback lobby
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room") || "lobby";

// Nickname speichern
let username = localStorage.getItem("fn_username");
if (!username) {
  username = prompt("Wie möchtest du heißen?") || "Gast";
  localStorage.setItem("fn_username", username);
}

// DOM Elemente
const messagesEl = document.getElementById("chatMessages");
const inputEl = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// Raum beitreten
socket.emit("joinRoom", roomId, username);

// Nachrichten senden
function sendMessage() {
  const text = inputEl.value;
  if (!text.trim()) return;

  socket.emit("chatMessage", text.trim());
  inputEl.value = "";
}

// Enter Taste
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// Button
sendBtn.addEventListener("click", sendMessage);

// Nachrichten im Chat anzeigen
function addMessage(text, cssClass = "") {
  const div = document.createElement("div");
  if (cssClass) div.classList.add(cssClass);
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Nachrichten vom Server empfangen
socket.on("chatMessage", ({ user, message }) => {
  addMessage(`${user}: ${message}`, "fn-chat-message");
});

socket.on("systemMessage", ({ message }) => {
  addMessage(message, "fn-system-message");
});

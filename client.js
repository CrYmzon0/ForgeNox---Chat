// Verbindung zum Server (Socket.IO)
const socket = io();

// DOM-Elemente
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const messages = document.getElementById('chat-messages');

function addMessage(text, fromSelf = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (fromSelf) li.classList.add('self');
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(`Du: ${text}`, true);

  socket.emit('chat-message', { text });

  input.value = '';
});

socket.on('chat-message', (data) => {
  addMessage(`User: ${data.text}`);
});

// system-messages.js
// Kümmert sich NUR um Systemnachrichten (Join/Leave)

(function () {
  const socket = window.socket;
  const messagesEl = document.getElementById("messages");
  if (!socket || !messagesEl) return;

  function addSystemMessage(text, type) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("fn-system-msg-wrapper");

    const badge = document.createElement("div");
    badge.classList.add("fn-system-msg");

    if (type === "join") {
      badge.classList.add("fn-system-msg-join");
    } else if (type === "leave") {
      badge.classList.add("fn-system-msg-leave");
    }

    badge.textContent = text;

    wrapper.appendChild(badge);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  socket.on("system-message", (data) => {
    if (!data || !data.text) return;
    addSystemMessage(data.text, data.type);
  });
})();
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
  // --------------------------------------------------
// Userliste aktualisieren (Server -> allUsers) + rendern
// --------------------------------------------------
socket.on("user-list", (users) => {
    const userList = document.getElementById("userList");
    userList.innerHTML = "";

    users.forEach((u) => {
        const li = document.createElement("li");
        li.classList.add("fn-user-entry");

        // Username links
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("fn-user-name");
        nameSpan.textContent = u.username;
        li.appendChild(nameSpan);

        // Badge rechts (nur wenn Rolle existiert)
        if (u.role && u.role !== "USER") {
            const img = document.createElement("img");
            img.classList.add("fn-role-badge");
            img.src = `/BADGES/${u.role} - BADGE.png`;  // exakt nach deinen Dateinamen
            img.alt = u.role;
            li.appendChild(img);
        }

        userList.appendChild(li);
    });
});

  // Username & Gender (kommen vom Server über /me)
  let username = "";
  let gender = "";
  // Merkt sich immer die aktuelle komplette Userliste
  let allUsers = [];

  // --------------------------------------------------
  // Nachricht im Chat anzeigen
  // --------------------------------------------------
  function addMessage({ text, fromSelf = false, userName = "" }) {
    if (!messagesEl) return;

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

    // eigene Nachricht sofort anzeigen
    addMessage({ text, fromSelf: true, userName: username });

    // an Server schicken
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
        window.location.href = "/";
        return;
      }

      username = data.username || "Gast";
      gender = data.gender || "";

      window.currentUsername = username;

      // Registrierung erst NACH Login-Daten
      socket.emit("register-user", {
        username,
        gender,
      });
    });

  // --------------------------------------------------
  // Userliste rendern (inkl. Suchfilter)
  // --------------------------------------------------
  function renderUserList() {
    if (!userListEl) return;

    const term =
      (userSearchEl && userSearchEl.value ? userSearchEl.value : "")
        .trim()
        .toLowerCase();

    const usersToRender = [];
    const source = Array.isArray(allUsers) ? allUsers : [];

    if (!term) {
      // Keine Suche: Reihenfolge wie vom Server
      source.forEach((u) => usersToRender.push(u));
    } else {
      const matches = [];
      const rest = [];

      source.forEach((u) => {
        const name = (u.username || "").toLowerCase();
        if (name.includes(term)) {
          matches.push(u);
        } else {
          rest.push(u);
        }
      });

      // erst passende User, dann der Rest, jeweils in Originalreihenfolge
      usersToRender.push(...matches, ...rest);
    }

    userListEl.innerHTML = "";
    usersToRender.forEach((user) => {
      const li = document.createElement("li");
      li.classList.add("fn-userlist-item");
      lli.classList.add("fn-user-entry");

const span = document.createElement("span");
span.classList.add("fn-user-name");
span.textContent = u.username;
li.appendChild(span);

if (u.role && u.role !== "USER") {
    const img = document.createElement("img");
    img.classList.add("fn-role-badge");
    img.src = `/BADGES/${u.role} - BADGE.png`;
    img.alt = u.role;
    li.appendChild(img);
}

      if (user.away) {
        li.classList.add("fn-user-away");
      }

      userListEl.appendChild(li);
    });
  }

  // Suche neu rendern, sobald der User tippt
  if (userSearchEl) {
    userSearchEl.addEventListener("input", () => {
      renderUserList();
    });
  }

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
  // Userliste aktualisieren (ohne Suche / ohne Counter)
  // --------------------------------------------------
  socket.on("user-list", (users) => {
    if (!userListEl) return;

    userListEl.innerHTML = "";
    (users || []).forEach((user) => {
        const li = document.createElement("li");
        li.classList.add("fn-userlist-item");

        // Username links
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("fn-user-name");
        nameSpan.textContent = user.username;
        li.appendChild(nameSpan);

        // Badge rechts (falls Rolle vorhanden)
        if (user.role && user.role !== "USER") {
            const img = document.createElement("img");
            img.classList.add("fn-role-badge");
            img.src = `/BADGES/${user.role} - BADGE.png`;
            img.alt = user.role;
            li.appendChild(img);
        }

        // Status "away"
        if (user.away) {
            li.classList.add("fn-user-away");
        }

        userListEl.appendChild(li);
    });
});
});

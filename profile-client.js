// profile-client.js

window.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("profileOpenBtn");
  const modal = document.getElementById("profileModal");
  const closeBtn = document.getElementById("profileCloseBtn");

  const usernameSpan = document.getElementById("profileUsername");
  const passwordInput = document.getElementById("profilePassword");
  const saveBtn = document.getElementById("profileSaveBtn");
  const msgEl = document.getElementById("profileMessage");

  function setMessage(text, type) {
    msgEl.textContent = text || "";
    msgEl.className = "fn-profile-message";

    if (type === "ok") msgEl.classList.add("fn-profile-message--ok");
    if (type === "error") msgEl.classList.add("fn-profile-message--error");
  }

  function openModal() {
    usernameSpan.textContent = window.currentUsername || "-";
    passwordInput.value = "";
    setMessage("", null);

    modal.classList.add("is-visible");
    passwordInput.focus();
  }

  function closeModal() {
    modal.classList.remove("is-visible");
    passwordInput.value = "";
    setMessage("", null);
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn.addEventListener("click", async () => {
    const pw = passwordInput.value.trim();

    if (pw.length < 4) {
      setMessage("Passwort muss mindestens 4 Zeichen lang sein.", "error");
      return;
    }

    try {
      const res = await fetch("/register-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: "password=" + encodeURIComponent(pw)
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("Passwort gespeichert. Dein Name ist jetzt geschützt.", "ok");
      } else {
        setMessage("Fehler: " + (data.error || "Unbekannter Fehler"), "error");
      }
    } catch (err) {
      setMessage("Netzwerkfehler. Bitte später erneut versuchen.", "error");
    }
  });
});

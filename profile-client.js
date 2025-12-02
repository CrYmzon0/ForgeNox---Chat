// profile-client.js
// Profil-Popup: Passwort setzen, vorhandenes Passwort anzeigen/ändern

window.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("profileOpenBtn");
  const modal = document.getElementById("profileModal");
  const closeBtn = document.getElementById("profileCloseBtn");

  const usernameSpan = document.getElementById("profileUsername");
  const passwordInput = document.getElementById("profilePassword");
  const saveBtn = document.getElementById("profileSaveBtn");
  const msgEl = document.getElementById("profileMessage");

  const sectionSetup = document.getElementById("profileSectionSetup");
  const sectionExisting = document.getElementById("profileSectionExisting");
  const showBtn = document.getElementById("profileShowBtn");
  const changeBtn = document.getElementById("profileChangeBtn");
  const pwDisplay = document.getElementById("profilePasswordDisplay");

  if (!openBtn || !modal) return;

  function setMessage(text, type) {
    msgEl.textContent = text || "";
    msgEl.classList.remove("fn-profile-message--ok", "fn-profile-message--error");
    if (type === "ok") msgEl.classList.add("fn-profile-message--ok");
    if (type === "error") msgEl.classList.add("fn-profile-message--error");
  }

  function showSetupSection() {
    sectionSetup.style.display = "block";
    sectionExisting.style.display = "none";
    pwDisplay.textContent = "";
  }

  function showExistingSection() {
    sectionSetup.style.display = "none";
    sectionExisting.style.display = "block";
    pwDisplay.textContent = "";
    setMessage("", null);
  }

  async function openModal() {
    usernameSpan.textContent = window.currentUsername || "-";
    passwordInput.value = "";
    setMessage("", null);
    pwDisplay.textContent = "";

    // Abfragen, ob für diesen User schon ein Passwort existiert
    try {
      const res = await fetch("/profile-info");
      const data = await res.json();
      if (data.ok && data.hasPassword) {
        showExistingSection();
      } else {
        showSetupSection();
      }
    } catch (e) {
      // Fallback: Setup anzeigen
      showSetupSection();
    }

    modal.classList.add("is-visible");

    if (sectionSetup.style.display !== "none") {
      passwordInput.focus();
    }
  }

  function closeModal() {
    modal.classList.remove("is-visible");
    passwordInput.value = "";
    setMessage("", null);
    pwDisplay.textContent = "";
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Passwort speichern / ändern
  saveBtn.addEventListener("click", async () => {
    const pw = passwordInput.value.trim();
    if (pw.length < 4) {
      setMessage("Passwort muss mindestens 4 Zeichen haben.", "error");
      return;
    }

    try {
      const res = await fetch("/register-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: "password=" + encodeURIComponent(pw),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage("Passwort gespeichert. Dein Name ist jetzt geschützt.", "ok");
        showExistingSection();
      } else {
        setMessage("Fehler: " + (data.error || "Unbekannter Fehler."), "error");
      }
    } catch (e) {
      setMessage("Netzwerkfehler. Bitte später erneut versuchen.", "error");
    }
  });

  // Passwort im Klartext anzeigen
  showBtn.addEventListener("click", async () => {
    pwDisplay.textContent = "Lade Passwort ...";
    try {
      const res = await fetch("/profile-show-password", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.password) {
        pwDisplay.textContent = "Dein Passwort: " + data.password;
      } else {
        pwDisplay.textContent = "Kein Passwort gespeichert.";
      }
    } catch (e) {
      pwDisplay.textContent = "Fehler beim Laden des Passworts.";
    }
  });

  // „Neues Passwort festlegen“ → zurück in den normalen Setup-Screen
  changeBtn.addEventListener("click", () => {
    passwordInput.value = "";
    setMessage("", null);
    pwDisplay.textContent = "";
    showSetupSection();
    passwordInput.focus();
  });
});

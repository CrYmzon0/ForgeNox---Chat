// auth-server.js
// Achtung: Passwörter werden im Klartext MIT Hash gespeichert – nicht für echte Produktion geeignet.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "registered-users.json");

let registeredUsers = {};

function loadUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    registeredUsers = JSON.parse(raw);
  } catch (e) {
    registeredUsers = {};
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(registeredUsers, null, 2), "utf8");
  } catch (e) {
    console.error("Fehler beim Speichern der Registrierungen:", e);
  }
}

function normalizeName(username) {
  return (username || "").toString().trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

// Name ist registriert, wenn ein Eintrag existiert
function isRegistered(username) {
  const key = normalizeName(username);
  return !!registeredUsers[key];
}

// Passwort setzen / ändern
function registerUser(username, password) {
  const clean = (username || "").toString().trim();
  if (!clean || !password || String(password).length < 4) {
    return { ok: false, error: "PASSWORD_WEAK" };
  }

  const key = normalizeName(clean);
  registeredUsers[key] = {
    username: clean,
    passwordHash: hashPassword(password),
    passwordPlain: String(password), // Klartext für „anzeigen“ – nur Demo
  };
  saveUsers();
  return { ok: true };
}

// Login-Prüfung
function verifyPassword(username, password) {
  const key = normalizeName(username);
  const entry = registeredUsers[key];
  if (!entry) return false;
  return entry.passwordHash === hashPassword(password);
}

// Hat der User ein Passwort hinterlegt?
function hasPassword(username) {
  const key = normalizeName(username);
  const entry = registeredUsers[key];
  return !!(entry && entry.passwordPlain);
}

// Klartext-Passwort holen (für Profil „anzeigen“)
function getPlainPassword(username) {
  const key = normalizeName(username);
  const entry = registeredUsers[key];
  return entry && entry.passwordPlain ? entry.passwordPlain : null;
}

// Gibt die bei der Registrierung gespeicherte Schreibweise zurück
function getCanonicalUsername(username) {
  const key = normalizeName(username);
  const entry = registeredUsers[key];
  // Falls registriert → gespeicherten Namen (mit Original-Groß/Klein)
  // sonst einfach den übergebenen Namen zurückgeben
  return entry && entry.username ? entry.username : username;
}

loadUsers();

module.exports = {
  isRegistered,
  registerUser,
  verifyPassword,
  hasPassword,
  getPlainPassword,
  getCanonicalUsername,   // <- NEU
};


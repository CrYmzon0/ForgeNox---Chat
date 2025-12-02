// auth-server.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "registered-users.json");
let registeredUsers = {};

function loadUsers() {
  try {
    registeredUsers = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    registeredUsers = {};
  }
}
function saveUsers() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(registeredUsers, null, 2));
}
function normalizeName(name) {
  return (name || "").toString().trim().toLowerCase();
}
function hash(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

function isRegistered(username) {
  return !!registeredUsers[normalizeName(username)];
}

function registerUser(username, password) {
  const clean = (username || "").toString().trim();
  if (!clean || !password || String(password).length < 4) {
    return { ok: false, error: "PASSWORD_WEAK" };
  }
  registeredUsers[normalizeName(clean)] = {
    username: clean,
    passwordHash: hash(password),
  };
  saveUsers();
  return { ok: true };
}

function verifyPassword(username, password) {
  const entry = registeredUsers[normalizeName(username)];
  if (!entry) return false;
  return entry.passwordHash === hash(password);
}

loadUsers();

module.exports = { isRegistered, registerUser, verifyPassword };

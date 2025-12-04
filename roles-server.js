// roles-server.js
// -----------------------------------------------
// Zentrale Rollenverwaltung
// -----------------------------------------------

// ROLE-HIERARCHIE (höchste oben)
const ROLE_ORDER = [
  "INHABER",
  "ADMIN",
  "TEAMLEITER",
  "MOD",
  "JUNIORMOD",
  "USER" // Standard
];

// MAP: username → Rolle
// Schreibweise muss exakt so sein, wie der User im Chat heißt
const USER_ROLES = {
  "MAXX": "ADMIN",
};

// Rolle holen
function getUserRole(username) {
  return USER_ROLES[username] || "USER";
}

// Vergleich: Darf user X >= Rolle Y?
function hasAtLeastRole(userRole, required) {
  return ROLE_ORDER.indexOf(userRole) <= ROLE_ORDER.indexOf(required);
}

module.exports = {
  getUserRole,
  hasAtLeastRole
};

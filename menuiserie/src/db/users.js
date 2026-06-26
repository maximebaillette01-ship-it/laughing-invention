const db = require('./index');

// Toutes les requêtes utilisent des paramètres liés (?) : aucune concaténation
// de chaînes avec une entrée utilisateur, ce qui élimine les injections SQL.

const findByUsername = db.prepare('SELECT * FROM users WHERE username = ?');

const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);

const updateFailedAttempts = db.prepare(
  'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?'
);

const resetFailedAttempts = db.prepare(
  'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?'
);

module.exports = {
  findByUsername(username) {
    return findByUsername.get(username);
  },
  createUser(username, passwordHash) {
    return insertUser.run(username, passwordHash);
  },
  recordFailedAttempt(userId, attempts, lockedUntil) {
    return updateFailedAttempts.run(attempts, lockedUntil, userId);
  },
  resetFailedAttempts(userId) {
    return resetFailedAttempts.run(userId);
  },
};

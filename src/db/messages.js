const db = require('./index');

const insertMessage = db.prepare(
  'INSERT INTO messages (name, email, message, ip) VALUES (?, ?, ?, ?)'
);

const listMessages = db.prepare(
  'SELECT * FROM messages ORDER BY created_at DESC LIMIT 200'
);

module.exports = {
  createMessage(name, email, message, ip) {
    return insertMessage.run(name, email, message, ip);
  },
  listMessages() {
    return listMessages.all();
  },
};

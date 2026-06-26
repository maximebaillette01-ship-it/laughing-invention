const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { databasePath } = require('../config/env');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// La table "sessions" (sid, sess, expire) est créée et gérée par
// better-sqlite3-session-store, voir src/middleware/session.js.

module.exports = db;

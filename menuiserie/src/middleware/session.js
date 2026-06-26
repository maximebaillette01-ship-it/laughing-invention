const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const db = require('../db');
const { sessionSecret, isProduction } = require('../config/env');

module.exports = session({
  store: new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 15 * 60 * 1000,
    },
  }),
  name: 'sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 8,
  },
});

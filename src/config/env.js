const path = require('path');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

function required(name, fallbackInDev) {
  const value = process.env[name];
  if (value) return value;
  if (!isProduction && fallbackInDev !== undefined) return fallbackInDev;
  throw new Error(`Variable d'environnement manquante: ${name}`);
}

module.exports = {
  isProduction,
  port: parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-do-not-use-in-prod'),
  trustProxy: process.env.TRUST_PROXY === '1',
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/app.sqlite'),
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  },
};

const bcrypt = require('bcryptjs');
const { admin } = require('../src/config/env');
const { findByUsername, createUser } = require('../src/db/users');

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 10;

async function main() {
  const { username, password } = admin;

  if (!username || !password) {
    console.error(
      'ADMIN_USERNAME et ADMIN_PASSWORD doivent être définis dans .env avant de lancer ce script.'
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`ADMIN_PASSWORD doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    process.exitCode = 1;
    return;
  }

  if (findByUsername(username)) {
    console.log(`L'utilisateur "${username}" existe déjà, aucune action effectuée.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  createUser(username, passwordHash);
  console.log(`Compte "${username}" créé avec succès.`);
}

main().catch((err) => {
  console.error('Erreur lors de la création du compte :', err);
  process.exitCode = 1;
});

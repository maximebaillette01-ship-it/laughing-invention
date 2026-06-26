const rateLimit = require('express-rate-limit');

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// Limite globale : protège contre les abus génériques / scraping agressif.
const globalLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { error: 'Trop de requêtes, merci de réessayer plus tard.' },
});

// Limite stricte sur la connexion : ralentit le brute-force / credential stuffing.
const loginLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});

// Limite sur le formulaire de contact : évite le spam automatisé.
const contactLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Trop de messages envoyés. Réessayez plus tard.' },
});

module.exports = { globalLimiter, loginLimiter, contactLimiter };

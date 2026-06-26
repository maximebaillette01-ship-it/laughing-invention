const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { loginLimiter } = require('../middleware/rateLimit');
const { csrfProtection } = require('../middleware/csrf');
const { findByUsername, recordFailedAttempt, resetFailedAttempts } = require('../db/users');

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Hash factice utilisé quand l'utilisateur n'existe pas, pour que le temps de
// réponse soit comparable à un échec de mot de passe et ne révèle pas
// l'existence du compte (mitigation d'attaque par énumération/timing).
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8gNZdMUH1jzpvjpRkZJjVbZW3T8dwm';

router.get('/login', (req, res) => {
  if (req.session.username) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Connexion', error: null });
});

router.post(
  '/login',
  loginLimiter,
  csrfProtection,
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('login', {
        title: 'Connexion',
        error: 'Identifiants invalides.',
      });
    }

    try {
      const { username, password } = req.body;
      const user = findByUsername(username);
      const now = Date.now();

      if (user && user.locked_until && user.locked_until > now) {
        return res.status(423).render('login', {
          title: 'Connexion',
          error: 'Compte temporairement bloqué suite à plusieurs échecs. Réessayez plus tard.',
        });
      }

      const hashToCompare = user ? user.password_hash : DUMMY_HASH;
      const passwordMatches = await bcrypt.compare(password, hashToCompare);

      if (!user || !passwordMatches) {
        if (user) {
          const attempts = user.failed_attempts + 1;
          const lockedUntil = attempts >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : null;
          recordFailedAttempt(user.id, attempts, lockedUntil);
        }
        return res.status(401).render('login', {
          title: 'Connexion',
          error: 'Identifiants invalides.',
        });
      }

      resetFailedAttempts(user.id);

      // Régénère la session à la connexion pour empêcher la fixation de session.
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.username = user.username;
        res.redirect('/dashboard');
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/logout', csrfProtection, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('sid');
    res.redirect('/login');
  });
});

module.exports = router;

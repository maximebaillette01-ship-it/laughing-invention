const express = require('express');
const { body, validationResult } = require('express-validator');
const { contactLimiter } = require('../middleware/rateLimit');
const { csrfProtection } = require('../middleware/csrf');
const { createMessage } = require('../db/messages');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'Accueil' });
});

router.get('/about', (req, res) => {
  res.render('about', { title: 'À propos' });
});

router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact', errors: [], values: {} });
});

// On valide/normalise les entrées ici, mais on ne les échappe pas au
// stockage : l'échappement HTML est délégué aux vues EJS (<%= %>) au
// moment de l'affichage, pour éviter un double-échappement et garder
// les données brutes correctes en base.
const contactValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis.')
    .isLength({ max: 100 })
    .withMessage('Le nom est trop long.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Adresse e-mail invalide.')
    .isLength({ max: 200 })
    .normalizeEmail(),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Le message est requis.')
    .isLength({ max: 2000 })
    .withMessage('Le message est trop long (2000 caractères max).'),
];

router.post(
  '/contact',
  contactLimiter,
  csrfProtection,
  contactValidators,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('contact', {
        title: 'Contact',
        errors: errors.array(),
        values: req.body,
      });
    }

    const { name, email, message } = req.body;
    createMessage(name, email, message, req.ip);

    res.render('contact-success', { title: 'Message envoyé' });
  }
);

module.exports = router;

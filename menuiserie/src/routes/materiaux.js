const express = require('express');
const { body, validationResult } = require('express-validator');
const { csrfProtection } = require('../middleware/csrf');
const materiauxDb = require('../db/materiaux');

const router = express.Router();

const validators = [
  body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
  body('unite').trim().notEmpty().withMessage("L'unité est obligatoire"),
  body('quantite').isFloat({ min: 0 }).withMessage('Quantité invalide'),
  body('seuil_alerte').isFloat({ min: 0 }).withMessage('Seuil invalide'),
  body('prix_unitaire')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Prix invalide'),
];

router.get('/', (req, res) => {
  res.render('materiaux/list', { title: 'Matériaux & stock', materiaux: materiauxDb.list() });
});

router.get('/new', (req, res) => {
  res.render('materiaux/form', { title: 'Nouveau matériau', materiau: {}, errors: [] });
});

router.post('/', csrfProtection, validators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('materiaux/form', {
      title: 'Nouveau matériau',
      materiau: req.body,
      errors: errors.array(),
    });
  }
  materiauxDb.create(req.body);
  res.redirect('/materiaux');
});

router.get('/:id/edit', (req, res) => {
  const materiau = materiauxDb.getById(req.params.id);
  if (!materiau) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('materiaux/form', { title: 'Modifier le matériau', materiau, errors: [] });
});

router.post('/:id', csrfProtection, validators, (req, res) => {
  const materiau = materiauxDb.getById(req.params.id);
  if (!materiau) return res.status(404).render('404', { title: 'Page non trouvée' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('materiaux/form', {
      title: 'Modifier le matériau',
      materiau: { ...req.body, id: materiau.id },
      errors: errors.array(),
    });
  }
  materiauxDb.update(req.params.id, req.body);
  res.redirect('/materiaux');
});

router.post('/:id/delete', csrfProtection, (req, res) => {
  materiauxDb.remove(req.params.id);
  res.redirect('/materiaux');
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const { csrfProtection } = require('../middleware/csrf');
const chantiersDb = require('../db/chantiers');
const clientsDb = require('../db/clients');
const devisDb = require('../db/devis');
const facturesDb = require('../db/factures');

const router = express.Router();

const validators = [
  body('client_id').isInt().withMessage('Client invalide'),
  body('titre').trim().notEmpty().withMessage('Le titre est obligatoire'),
  body('statut').isIn(chantiersDb.STATUTS).withMessage('Statut invalide'),
];

router.get('/', (req, res) => {
  res.render('chantiers/list', {
    title: 'Chantiers',
    chantiers: chantiersDb.list(),
    STATUT_LABELS: chantiersDb.STATUT_LABELS,
  });
});

router.get('/new', (req, res) => {
  res.render('chantiers/form', {
    title: 'Nouveau chantier',
    chantier: { client_id: req.query.client_id || '' },
    clients: clientsDb.list(),
    statuts: chantiersDb.STATUTS,
    STATUT_LABELS: chantiersDb.STATUT_LABELS,
    errors: [],
  });
});

router.post('/', csrfProtection, validators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('chantiers/form', {
      title: 'Nouveau chantier',
      chantier: req.body,
      clients: clientsDb.list(),
      statuts: chantiersDb.STATUTS,
      STATUT_LABELS: chantiersDb.STATUT_LABELS,
      errors: errors.array(),
    });
  }
  const id = chantiersDb.create(req.body);
  res.redirect(`/chantiers/${id}`);
});

router.get('/:id', (req, res) => {
  const chantier = chantiersDb.getById(req.params.id);
  if (!chantier) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('chantiers/show', {
    title: chantier.titre,
    chantier,
    STATUT_LABELS: chantiersDb.STATUT_LABELS,
    devis: devisDb.listByChantier(chantier.id),
    factures: facturesDb.listByChantier(chantier.id),
  });
});

router.get('/:id/edit', (req, res) => {
  const chantier = chantiersDb.getById(req.params.id);
  if (!chantier) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('chantiers/form', {
    title: 'Modifier le chantier',
    chantier,
    clients: clientsDb.list(),
    statuts: chantiersDb.STATUTS,
    STATUT_LABELS: chantiersDb.STATUT_LABELS,
    errors: [],
  });
});

router.post('/:id', csrfProtection, validators, (req, res) => {
  const chantier = chantiersDb.getById(req.params.id);
  if (!chantier) return res.status(404).render('404', { title: 'Page non trouvée' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('chantiers/form', {
      title: 'Modifier le chantier',
      chantier: { ...req.body, id: chantier.id },
      clients: clientsDb.list(),
      statuts: chantiersDb.STATUTS,
      STATUT_LABELS: chantiersDb.STATUT_LABELS,
      errors: errors.array(),
    });
  }
  chantiersDb.update(req.params.id, req.body);
  res.redirect(`/chantiers/${req.params.id}`);
});

router.post('/:id/delete', csrfProtection, (req, res) => {
  chantiersDb.remove(req.params.id);
  res.redirect('/chantiers');
});

module.exports = router;

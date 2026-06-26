const express = require('express');
const { body, validationResult } = require('express-validator');
const { csrfProtection } = require('../middleware/csrf');
const clientsDb = require('../db/clients');
const chantiersDb = require('../db/chantiers');
const devisDb = require('../db/devis');
const facturesDb = require('../db/factures');

const router = express.Router();

const validators = [
  body('nom').trim().notEmpty().withMessage('Le nom est obligatoire'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('E-mail invalide'),
];

router.get('/', (req, res) => {
  res.render('clients/list', { title: 'Clients', clients: clientsDb.list() });
});

router.get('/new', (req, res) => {
  res.render('clients/form', { title: 'Nouveau client', record: {}, errors: [] });
});

router.post('/', csrfProtection, validators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('clients/form', {
      title: 'Nouveau client',
      record: req.body,
      errors: errors.array(),
    });
  }
  const id = clientsDb.create(req.body);
  res.redirect(`/clients/${id}`);
});

router.get('/:id', (req, res) => {
  const record = clientsDb.getById(req.params.id);
  if (!record) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('clients/show', {
    title: record.nom,
    record,
    chantiers: chantiersDb.listByClient(record.id),
    devis: devisDb.listByClient(record.id),
    factures: facturesDb.listByClient(record.id),
  });
});

router.get('/:id/edit', (req, res) => {
  const record = clientsDb.getById(req.params.id);
  if (!record) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('clients/form', { title: 'Modifier le client', record, errors: [] });
});

router.post('/:id', csrfProtection, validators, (req, res) => {
  const record = clientsDb.getById(req.params.id);
  if (!record) return res.status(404).render('404', { title: 'Page non trouvée' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('clients/form', {
      title: 'Modifier le client',
      record: { ...req.body, id: record.id },
      errors: errors.array(),
    });
  }
  clientsDb.update(req.params.id, req.body);
  res.redirect(`/clients/${req.params.id}`);
});

router.post('/:id/delete', csrfProtection, (req, res) => {
  clientsDb.remove(req.params.id);
  res.redirect('/clients');
});

module.exports = router;

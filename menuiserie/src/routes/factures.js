const express = require('express');
const { body, validationResult } = require('express-validator');
const { csrfProtection } = require('../middleware/csrf');
const facturesDb = require('../db/factures');
const clientsDb = require('../db/clients');
const chantiersDb = require('../db/chantiers');

const router = express.Router();

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function buildLignesFromBody(body) {
  const descriptions = toArray(body.description);
  const quantites = toArray(body.quantite);
  const unites = toArray(body.unite);
  const prix = toArray(body.prix_unitaire);
  return descriptions.map((description, i) => ({
    description,
    quantite: quantites[i],
    unite: unites[i],
    prix_unitaire: prix[i],
  }));
}

const validators = [
  body('client_id').isInt().withMessage('Client invalide'),
  body('taux_tva').isFloat({ min: 0, max: 100 }).withMessage('Taux de TVA invalide'),
];

function formContext(extra) {
  return {
    clients: clientsDb.list(),
    chantiers: chantiersDb.list(),
    ...extra,
  };
}

router.get('/', (req, res) => {
  const factures = facturesDb.list().map((f) => ({ ...f, enRetard: facturesDb.isOverdue(f) }));
  res.render('factures/list', {
    title: 'Factures',
    factures,
    STATUT_LABELS: facturesDb.STATUT_LABELS,
  });
});

router.get('/new', (req, res) => {
  res.render(
    'factures/form',
    formContext({
      title: 'Nouvelle facture',
      facture: { client_id: req.query.client_id || '', chantier_id: req.query.chantier_id || '', taux_tva: 20 },
      lignes: [{}, {}],
      errors: [],
    })
  );
});

router.post('/', csrfProtection, validators, (req, res) => {
  const lignes = buildLignesFromBody(req.body);
  const errors = validationResult(req).array();
  if (!lignes.length) errors.push({ msg: 'Ajoutez au moins une ligne.' });

  if (errors.length) {
    return res.status(400).render(
      'factures/form',
      formContext({
        title: 'Nouvelle facture',
        facture: req.body,
        lignes,
        errors,
      })
    );
  }

  const id = facturesDb.create({ ...req.body, lignes });
  res.redirect(`/factures/${id}`);
});

router.get('/:id', (req, res) => {
  const facture = facturesDb.getById(req.params.id);
  if (!facture) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('factures/show', {
    title: `Facture FAC-${String(facture.id).padStart(4, '0')}`,
    facture,
    enRetard: facturesDb.isOverdue(facture),
    lignes: facturesDb.getLignes(facture.id),
    STATUTS: facturesDb.STATUTS,
    STATUT_LABELS: facturesDb.STATUT_LABELS,
  });
});

router.get('/:id/edit', (req, res) => {
  const facture = facturesDb.getById(req.params.id);
  if (!facture) return res.status(404).render('404', { title: 'Page non trouvée' });
  const lignes = facturesDb.getLignes(facture.id);
  res.render(
    'factures/form',
    formContext({
      title: 'Modifier la facture',
      facture,
      lignes: lignes.length ? lignes : [{}, {}],
      errors: [],
    })
  );
});

router.post('/:id', csrfProtection, validators, (req, res) => {
  const facture = facturesDb.getById(req.params.id);
  if (!facture) return res.status(404).render('404', { title: 'Page non trouvée' });

  const lignes = buildLignesFromBody(req.body);
  const errors = validationResult(req).array();
  if (!lignes.length) errors.push({ msg: 'Ajoutez au moins une ligne.' });

  if (errors.length) {
    return res.status(400).render(
      'factures/form',
      formContext({
        title: 'Modifier la facture',
        facture: { ...req.body, id: facture.id },
        lignes,
        errors,
      })
    );
  }

  facturesDb.update(req.params.id, { ...req.body, lignes });
  res.redirect(`/factures/${req.params.id}`);
});

router.post(
  '/:id/statut',
  csrfProtection,
  body('statut').isIn(facturesDb.STATUTS),
  (req, res) => {
    const facture = facturesDb.getById(req.params.id);
    if (!facture) return res.status(404).render('404', { title: 'Page non trouvée' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.redirect(`/factures/${req.params.id}`);
    facturesDb.updateStatut(req.params.id, req.body.statut);
    res.redirect(`/factures/${req.params.id}`);
  }
);

router.post('/:id/delete', csrfProtection, (req, res) => {
  facturesDb.remove(req.params.id);
  res.redirect('/factures');
});

module.exports = router;

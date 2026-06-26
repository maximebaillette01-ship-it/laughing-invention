const express = require('express');
const { body, validationResult } = require('express-validator');
const { csrfProtection } = require('../middleware/csrf');
const devisDb = require('../db/devis');
const clientsDb = require('../db/clients');
const chantiersDb = require('../db/chantiers');
const facturesDb = require('../db/factures');

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
  res.render('devis/list', {
    title: 'Devis',
    devis: devisDb.list(),
    STATUT_LABELS: devisDb.STATUT_LABELS,
  });
});

router.get('/new', (req, res) => {
  res.render(
    'devis/form',
    formContext({
      title: 'Nouveau devis',
      devis: { client_id: req.query.client_id || '', chantier_id: req.query.chantier_id || '', taux_tva: 20 },
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
      'devis/form',
      formContext({
        title: 'Nouveau devis',
        devis: req.body,
        lignes,
        errors,
      })
    );
  }

  const id = devisDb.create({ ...req.body, lignes });
  res.redirect(`/devis/${id}`);
});

router.get('/:id', (req, res) => {
  const devis = devisDb.getById(req.params.id);
  if (!devis) return res.status(404).render('404', { title: 'Page non trouvée' });
  res.render('devis/show', {
    title: `Devis DEV-${String(devis.id).padStart(4, '0')}`,
    devis,
    lignes: devisDb.getLignes(devis.id),
    STATUTS: devisDb.STATUTS,
    STATUT_LABELS: devisDb.STATUT_LABELS,
    facture: facturesDb.findByDevisId(devis.id),
  });
});

router.get('/:id/edit', (req, res) => {
  const devis = devisDb.getById(req.params.id);
  if (!devis) return res.status(404).render('404', { title: 'Page non trouvée' });
  const lignes = devisDb.getLignes(devis.id);
  res.render(
    'devis/form',
    formContext({
      title: 'Modifier le devis',
      devis,
      lignes: lignes.length ? lignes : [{}, {}],
      errors: [],
    })
  );
});

router.post('/:id', csrfProtection, validators, (req, res) => {
  const devis = devisDb.getById(req.params.id);
  if (!devis) return res.status(404).render('404', { title: 'Page non trouvée' });

  const lignes = buildLignesFromBody(req.body);
  const errors = validationResult(req).array();
  if (!lignes.length) errors.push({ msg: 'Ajoutez au moins une ligne.' });

  if (errors.length) {
    return res.status(400).render(
      'devis/form',
      formContext({
        title: 'Modifier le devis',
        devis: { ...req.body, id: devis.id },
        lignes,
        errors,
      })
    );
  }

  devisDb.update(req.params.id, { ...req.body, lignes });
  res.redirect(`/devis/${req.params.id}`);
});

router.post('/:id/statut', csrfProtection, body('statut').isIn(devisDb.STATUTS), (req, res) => {
  const devis = devisDb.getById(req.params.id);
  if (!devis) return res.status(404).render('404', { title: 'Page non trouvée' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.redirect(`/devis/${req.params.id}`);
  devisDb.updateStatut(req.params.id, req.body.statut);
  res.redirect(`/devis/${req.params.id}`);
});

router.post('/:id/convertir', csrfProtection, (req, res) => {
  const devis = devisDb.getById(req.params.id);
  if (!devis) return res.status(404).render('404', { title: 'Page non trouvée' });
  if (devis.statut !== 'accepte' || facturesDb.findByDevisId(devis.id)) {
    return res.redirect(`/devis/${req.params.id}`);
  }
  const factureId = facturesDb.createFromDevis(devis.id);
  res.redirect(`/factures/${factureId}`);
});

router.post('/:id/delete', csrfProtection, (req, res) => {
  devisDb.remove(req.params.id);
  res.redirect('/devis');
});

module.exports = router;

const express = require('express');
const clientsDb = require('../db/clients');
const materiauxDb = require('../db/materiaux');
const chantiersDb = require('../db/chantiers');
const devisDb = require('../db/devis');
const facturesDb = require('../db/factures');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));

router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Tableau de bord',
    stats: {
      clients: clientsDb.count(),
      chantiersEnCours: chantiersDb.countByStatut('en_cours'),
      chantiersEnAttente: chantiersDb.countByStatut('en_attente'),
      devisEnAttente: devisDb.countByStatut('envoye'),
      facturesImpayees: facturesDb.countUnpaid(),
      facturesEnRetard: facturesDb.countOverdue(),
      materiauxBas: materiauxDb.countLowStock(),
    },
    materiauxBas: materiauxDb.listLowStock(),
    chantiersRecents: chantiersDb.list().slice(0, 5),
    STATUT_LABELS_CHANTIER: chantiersDb.STATUT_LABELS,
  });
});

module.exports = router;

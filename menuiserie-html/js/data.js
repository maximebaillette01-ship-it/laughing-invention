/* Couche de données : tout est stocké dans le localStorage du navigateur.
   Aucun serveur, aucune base de données externe : le site fonctionne en
   ouvrant simplement index.html. */

var Data = (function () {
  'use strict';

  var STORAGE_KEY = 'menuiserieDB_v1';

  var STATUTS_CHANTIER = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    termine: 'Terminé',
    annule: 'Annulé',
  };

  var STATUTS_DEVIS = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
  };

  var STATUTS_FACTURE = {
    impayee: 'Impayée',
    payee: 'Payée',
  };

  function uid(prefix) {
    return (
      (prefix || 'id') +
      '_' +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDaysISO(iso, days) {
    var d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function formatMoney(amount) {
    var n = Number(amount) || 0;
    return (
      n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      ' €'
    );
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function computeLigneTotal(ligne) {
    var qte = Number(ligne.quantite) || 0;
    var prix = Number(ligne.prixUnitaire) || 0;
    return round2(qte * prix);
  }

  function computeTotaux(lignes, tauxTva) {
    var totalHt = 0;
    (lignes || []).forEach(function (l) {
      totalHt += computeLigneTotal(l);
    });
    totalHt = round2(totalHt);
    var totalTva = round2(totalHt * ((Number(tauxTva) || 0) / 100));
    var totalTtc = round2(totalHt + totalTva);
    return { totalHt: totalHt, totalTva: totalTva, totalTtc: totalTtc };
  }

  function seedDB() {
    var clientId1 = 'cl_1';
    var clientId2 = 'cl_2';
    var clientId3 = 'cl_3';
    var chantierId1 = 'ct_1';
    var chantierId2 = 'ct_2';
    var chantierId3 = 'ct_3';

    var db = {
      clients: [
        {
          id: clientId1,
          nom: 'Marie Lefèvre',
          entreprise: '',
          email: 'marie.lefevre@example.com',
          telephone: '06 12 34 56 78',
          adresse: '12 rue des Tilleuls, 44000 Nantes',
          notes: 'Préfère être contactée le matin.',
          createdAt: todayISO(),
        },
        {
          id: clientId2,
          nom: 'Paul Dupont',
          entreprise: 'Dupont Rénovation',
          email: 'contact@dupont-renovation.example',
          telephone: '02 40 11 22 33',
          adresse: '5 avenue de la Gare, 44300 Nantes',
          notes: '',
          createdAt: todayISO(),
        },
        {
          id: clientId3,
          nom: 'Jean Petit',
          entreprise: '',
          email: 'jean.petit@example.com',
          telephone: '06 98 76 54 32',
          adresse: '3 impasse des Chênes, 44100 Nantes',
          notes: '',
          createdAt: todayISO(),
        },
      ],
      materiaux: [
        {
          id: 'ma_1',
          nom: 'Planches de chêne 27 mm',
          quantite: 120,
          unite: 'm²',
          seuilAlerte: 50,
          prixUnitaire: 45,
          createdAt: todayISO(),
        },
        {
          id: 'ma_2',
          nom: 'Vis inox 4x40',
          quantite: 30,
          unite: 'boîte',
          seuilAlerte: 10,
          prixUnitaire: 8.5,
          createdAt: todayISO(),
        },
        {
          id: 'ma_3',
          nom: 'Vernis bois extérieur',
          quantite: 4,
          unite: 'L',
          seuilAlerte: 5,
          prixUnitaire: 22,
          createdAt: todayISO(),
        },
        {
          id: 'ma_4',
          nom: 'Panneaux MDF 18 mm',
          quantite: 60,
          unite: 'm²',
          seuilAlerte: 20,
          prixUnitaire: 28,
          createdAt: todayISO(),
        },
      ],
      chantiers: [
        {
          id: chantierId1,
          titre: 'Pose terrasse bois',
          clientId: clientId1,
          adresse: '12 rue des Tilleuls, 44000 Nantes',
          statut: 'en_cours',
          dateDebut: addDaysISO(todayISO(), -10),
          dateFin: addDaysISO(todayISO(), 5),
          description: 'Terrasse en bois exotique, 35 m².',
          createdAt: todayISO(),
        },
        {
          id: chantierId2,
          titre: 'Rénovation cuisine',
          clientId: clientId2,
          adresse: '5 avenue de la Gare, 44300 Nantes',
          statut: 'en_attente',
          dateDebut: '',
          dateFin: '',
          description: 'Meubles de cuisine sur mesure.',
          createdAt: todayISO(),
        },
        {
          id: chantierId3,
          titre: 'Escalier sur mesure',
          clientId: clientId3,
          adresse: '3 impasse des Chênes, 44100 Nantes',
          statut: 'termine',
          dateDebut: addDaysISO(todayISO(), -60),
          dateFin: addDaysISO(todayISO(), -20),
          description: 'Escalier quart tournant en hêtre.',
          createdAt: todayISO(),
        },
      ],
      devis: [
        {
          id: 'dv_1',
          numero: 'DEV-' + new Date().getFullYear() + '-0001',
          clientId: clientId1,
          chantierId: chantierId1,
          statut: 'accepte',
          dateCreation: addDaysISO(todayISO(), -12),
          dateValidite: addDaysISO(todayISO(), 18),
          tauxTva: 20,
          lignes: [
            { description: 'Lames de terrasse bois exotique', quantite: 35, unite: 'm²', prixUnitaire: 65 },
            { description: 'Pose et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 800 },
          ],
          notes: '',
          createdAt: addDaysISO(todayISO(), -12),
        },
        {
          id: 'dv_2',
          numero: 'DEV-' + new Date().getFullYear() + '-0002',
          clientId: clientId2,
          chantierId: chantierId2,
          statut: 'envoye',
          dateCreation: addDaysISO(todayISO(), -3),
          dateValidite: addDaysISO(todayISO(), 27),
          tauxTva: 20,
          lignes: [
            { description: 'Meubles de cuisine sur mesure', quantite: 6, unite: 'unité', prixUnitaire: 450 },
            { description: 'Plan de travail chêne massif', quantite: 4, unite: 'm', prixUnitaire: 180 },
          ],
          notes: 'En attente de réponse du client.',
          createdAt: addDaysISO(todayISO(), -3),
        },
        {
          id: 'dv_3',
          numero: 'DEV-' + new Date().getFullYear() + '-0003',
          clientId: clientId3,
          chantierId: chantierId3,
          statut: 'refuse',
          dateCreation: addDaysISO(todayISO(), -70),
          dateValidite: addDaysISO(todayISO(), -40),
          tauxTva: 20,
          lignes: [{ description: 'Rampe en acier brossé', quantite: 1, unite: 'forfait', prixUnitaire: 600 }],
          notes: 'Le client a finalement choisi une rampe en bois.',
          createdAt: addDaysISO(todayISO(), -70),
        },
      ],
      factures: [
        {
          id: 'fa_1',
          numero: 'FAC-' + new Date().getFullYear() + '-0001',
          clientId: clientId1,
          chantierId: chantierId1,
          devisId: 'dv_1',
          statut: 'payee',
          dateEmission: addDaysISO(todayISO(), -2),
          dateEcheance: addDaysISO(todayISO(), 28),
          tauxTva: 20,
          lignes: [
            { description: 'Lames de terrasse bois exotique', quantite: 35, unite: 'm²', prixUnitaire: 65 },
            { description: 'Pose et finitions', quantite: 1, unite: 'forfait', prixUnitaire: 800 },
          ],
          notes: '',
          createdAt: addDaysISO(todayISO(), -2),
        },
        {
          id: 'fa_2',
          numero: 'FAC-' + new Date().getFullYear() + '-0002',
          clientId: clientId3,
          chantierId: chantierId3,
          devisId: '',
          statut: 'impayee',
          dateEmission: addDaysISO(todayISO(), -45),
          dateEcheance: addDaysISO(todayISO(), -15),
          tauxTva: 20,
          lignes: [{ description: 'Réparation marche escalier', quantite: 1, unite: 'forfait', prixUnitaire: 150 }],
          notes: '',
          createdAt: addDaysISO(todayISO(), -45),
        },
      ],
      compteurs: { devis: 3, facture: 2 },
    };

    return db;
  }

  function load() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) {
      var db = seedDB();
      save(db);
      return db;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      var fresh = seedDB();
      save(fresh);
      return fresh;
    }
  }

  function save(db) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      /* stockage indisponible (navigation privée, quota dépassé...) */
    }
  }

  var db = load();

  function persist() {
    save(db);
  }

  function nextNumero(type) {
    var year = new Date().getFullYear();
    db.compteurs[type] = (db.compteurs[type] || 0) + 1;
    var seq = String(db.compteurs[type]).padStart(4, '0');
    var prefix = type === 'devis' ? 'DEV' : 'FAC';
    persist();
    return prefix + '-' + year + '-' + seq;
  }

  function makeCollection(key, prefix) {
    return {
      list: function () {
        return db[key].slice();
      },
      get: function (id) {
        return db[key].find(function (r) {
          return r.id === id;
        });
      },
      create: function (data) {
        var record = Object.assign({}, data, { id: uid(prefix), createdAt: todayISO() });
        db[key].push(record);
        persist();
        return record;
      },
      update: function (id, data) {
        var record = db[key].find(function (r) {
          return r.id === id;
        });
        if (!record) return null;
        Object.assign(record, data);
        persist();
        return record;
      },
      remove: function (id) {
        db[key] = db[key].filter(function (r) {
          return r.id !== id;
        });
        persist();
      },
    };
  }

  var clients = makeCollection('clients', 'cl');
  var materiaux = makeCollection('materiaux', 'ma');
  var chantiers = makeCollection('chantiers', 'ct');
  var devisBase = makeCollection('devis', 'dv');
  var facturesBase = makeCollection('factures', 'fa');

  var devis = Object.assign({}, devisBase, {
    create: function (data) {
      var record = Object.assign({}, data, {
        id: uid('dv'),
        numero: nextNumero('devis'),
        createdAt: todayISO(),
      });
      db.devis.push(record);
      persist();
      return record;
    },
  });

  var factures = Object.assign({}, facturesBase, {
    create: function (data) {
      var record = Object.assign({}, data, {
        id: uid('fa'),
        numero: nextNumero('facture'),
        createdAt: todayISO(),
      });
      db.factures.push(record);
      persist();
      return record;
    },
  });

  function isFactureEnRetard(facture) {
    return facture.statut === 'impayee' && facture.dateEcheance && facture.dateEcheance < todayISO();
  }

  function stats() {
    var chantiersEnCours = db.chantiers.filter(function (c) {
      return c.statut === 'en_cours';
    }).length;
    var chantiersEnAttente = db.chantiers.filter(function (c) {
      return c.statut === 'en_attente';
    }).length;
    var devisEnAttente = db.devis.filter(function (d) {
      return d.statut === 'envoye';
    }).length;
    var facturesImpayees = db.factures.filter(function (f) {
      return f.statut === 'impayee';
    }).length;
    var facturesEnRetard = db.factures.filter(isFactureEnRetard).length;
    var materiauxBas = db.materiaux.filter(function (m) {
      return Number(m.quantite) <= Number(m.seuilAlerte);
    });

    return {
      nbClients: db.clients.length,
      chantiersEnCours: chantiersEnCours,
      chantiersEnAttente: chantiersEnAttente,
      devisEnAttente: devisEnAttente,
      facturesImpayees: facturesImpayees,
      facturesEnRetard: facturesEnRetard,
      materiauxBas: materiauxBas,
    };
  }

  function resetDemo() {
    db = seedDB();
    persist();
  }

  function wipeAll() {
    db = { clients: [], materiaux: [], chantiers: [], devis: [], factures: [], compteurs: { devis: 0, facture: 0 } };
    persist();
  }

  function exportJSON() {
    return JSON.stringify(db, null, 2);
  }

  function importJSON(json) {
    var parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('Fichier invalide');
    ['clients', 'materiaux', 'chantiers', 'devis', 'factures'].forEach(function (key) {
      if (!Array.isArray(parsed[key])) parsed[key] = [];
    });
    if (!parsed.compteurs) parsed.compteurs = { devis: 0, facture: 0 };
    db = parsed;
    persist();
  }

  return {
    STATUTS_CHANTIER: STATUTS_CHANTIER,
    STATUTS_DEVIS: STATUTS_DEVIS,
    STATUTS_FACTURE: STATUTS_FACTURE,
    clients: clients,
    materiaux: materiaux,
    chantiers: chantiers,
    devis: devis,
    factures: factures,
    computeLigneTotal: computeLigneTotal,
    computeTotaux: computeTotaux,
    isFactureEnRetard: isFactureEnRetard,
    stats: stats,
    todayISO: todayISO,
    formatDate: formatDate,
    formatMoney: formatMoney,
    resetDemo: resetDemo,
    wipeAll: wipeAll,
    exportJSON: exportJSON,
    importJSON: importJSON,
    addDaysISO: addDaysISO,
  };
})();

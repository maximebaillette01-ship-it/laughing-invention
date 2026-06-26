/* Application (routage par hash + rendu des vues). Script classique
   (pas de module ES) afin de fonctionner aussi en ouvrant index.html
   directement depuis le disque, sans serveur. */

(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pageHeader(title, actions) {
    return (
      '<div class="page-header"><h1>' +
      esc(title) +
      '</h1><div class="page-actions">' +
      (actions || '') +
      '</div></div>'
    );
  }

  function emptyRow(colspan, msg) {
    return '<tr><td colspan="' + colspan + '" class="empty">' + esc(msg) + '</td></tr>';
  }

  function listOrEmpty(arr, mapFn, emptyMsg) {
    if (!arr.length) return '<p class="empty">' + esc(emptyMsg) + '</p>';
    return '<ul class="simple-list">' + arr.map(mapFn).join('') + '</ul>';
  }

  function statutBadge(map, value) {
    return '<span class="badge badge-' + value + '">' + esc(map[value] || value) + '</span>';
  }

  function actionBtn(label, action, id, status) {
    return (
      '<button type="button" class="btn btn-sm" data-action="' +
      action +
      '" data-id="' +
      id +
      '" data-status="' +
      status +
      '">' +
      esc(label) +
      '</button>'
    );
  }

  function clientLabel(clientId) {
    var c = Data.clients.get(clientId);
    if (!c) return 'Client supprimé';
    return c.nom + (c.entreprise ? ' (' + c.entreprise + ')' : '');
  }

  function clientOptionsHtml(selectedId) {
    return Data.clients
      .list()
      .sort(function (a, b) {
        return a.nom.localeCompare(b.nom, 'fr');
      })
      .map(function (c) {
        return (
          '<option value="' +
          c.id +
          '"' +
          (c.id === selectedId ? ' selected' : '') +
          '>' +
          esc(c.nom + (c.entreprise ? ' (' + c.entreprise + ')' : '')) +
          '</option>'
        );
      })
      .join('');
  }

  function chantierOptionsHtml(selectedId) {
    return Data.chantiers
      .list()
      .map(function (c) {
        var client = Data.clients.get(c.clientId);
        var label = c.titre + (client ? ' — ' + client.nom : '');
        return (
          '<option value="' +
          c.id +
          '"' +
          (c.id === selectedId ? ' selected' : '') +
          '>' +
          esc(label) +
          '</option>'
        );
      })
      .join('');
  }

  function ligneRowHtml(l) {
    l = l || {};
    return (
      '<tr class="ligne-row">' +
      '<td><input type="text" class="f-description" value="' +
      esc(l.description || '') +
      '" placeholder="Description"></td>' +
      '<td><input type="number" class="f-quantite" value="' +
      (l.quantite != null ? l.quantite : 1) +
      '" min="0" step="0.01"></td>' +
      '<td><input type="text" class="f-unite" value="' +
      esc(l.unite || '') +
      '" placeholder="unité"></td>' +
      '<td><input type="number" class="f-prix" value="' +
      (l.prixUnitaire != null ? l.prixUnitaire : 0) +
      '" min="0" step="0.01"></td>' +
      '<td class="ligne-total">0,00 €</td>' +
      '<td><button type="button" class="btn btn-icon" data-action="remove-ligne" aria-label="Supprimer la ligne">✕</button></td>' +
      '</tr>'
    );
  }

  function lignesEditorHtml(lignes) {
    var initial = lignes && lignes.length ? lignes : [{ description: '', quantite: 1, unite: '', prixUnitaire: 0 }];
    var rows = initial.map(ligneRowHtml).join('');
    return (
      '<div class="lignes-editor">' +
      '<div class="table-wrap"><table class="data-table" id="lignes-table">' +
      '<thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th><th></th></tr></thead>' +
      '<tbody id="lignes-body">' +
      rows +
      '</tbody></table></div>' +
      '<button type="button" class="btn btn-sm" data-action="add-ligne">+ Ajouter une ligne</button>' +
      '<table class="totals-table">' +
      '<tr><td>Total HT</td><td id="total-ht">0,00 €</td></tr>' +
      '<tr><td>TVA</td><td id="total-tva">0,00 €</td></tr>' +
      '<tr class="grand-total"><td>Total TTC</td><td id="total-ttc">0,00 €</td></tr>' +
      '</table>' +
      '</div>'
    );
  }

  function notFoundView() {
    return (
      pageHeader('Page introuvable') +
      '<p>L’élément demandé n’existe pas ou a été supprimé.</p>' +
      '<a class="btn" href="#/dashboard">Retour au tableau de bord</a>'
    );
  }

  /* ---------------------------------------------------------------- */
  /* Vues                                                               */
  /* ---------------------------------------------------------------- */

  var Views = {};

  Views.dashboard = function () {
    var s = Data.stats();
    var chantiersEnCours = Data.chantiers.list().filter(function (c) {
      return c.statut === 'en_cours';
    });
    var devisEnAttente = Data.devis.list().filter(function (d) {
      return d.statut === 'envoye';
    });
    var facturesARelancer = Data.factures.list().filter(function (f) {
      return f.statut === 'impayee';
    });

    function statCard(label, value, href, alert) {
      return (
        '<a class="stat-card' +
        (alert ? ' alert' : '') +
        '" href="' +
        href +
        '"><span class="stat-value">' +
        value +
        '</span><span class="stat-label">' +
        esc(label) +
        '</span></a>'
      );
    }

    return (
      pageHeader('Tableau de bord') +
      '<div class="stats-grid">' +
      statCard('Clients', s.nbClients, '#/clients') +
      statCard('Chantiers en cours', s.chantiersEnCours, '#/chantiers') +
      statCard('Chantiers en attente', s.chantiersEnAttente, '#/chantiers') +
      statCard('Devis en attente', s.devisEnAttente, '#/devis') +
      statCard('Factures impayées', s.facturesImpayees, '#/factures') +
      statCard('Factures en retard', s.facturesEnRetard, '#/factures', s.facturesEnRetard > 0) +
      statCard('Matériaux sous seuil', s.materiauxBas.length, '#/materiaux', s.materiauxBas.length > 0) +
      '</div>' +
      '<div class="dashboard-columns">' +
      '<section class="panel"><h2>Chantiers en cours</h2>' +
      listOrEmpty(
        chantiersEnCours,
        function (c) {
          return '<li><a href="#/chantiers/' + c.id + '">' + esc(c.titre) + '</a> — ' + esc(clientLabel(c.clientId)) + '</li>';
        },
        'Aucun chantier en cours.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Devis en attente de réponse</h2>' +
      listOrEmpty(
        devisEnAttente,
        function (d) {
          return '<li><a href="#/devis/' + d.id + '">' + esc(d.numero) + '</a> — ' + esc(clientLabel(d.clientId)) + '</li>';
        },
        'Aucun devis en attente.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Factures à relancer</h2>' +
      listOrEmpty(
        facturesARelancer,
        function (f) {
          return (
            '<li><a href="#/factures/' +
            f.id +
            '">' +
            esc(f.numero) +
            '</a> — ' +
            esc(clientLabel(f.clientId)) +
            (Data.isFactureEnRetard(f) ? ' <span class="badge badge-en_retard">En retard</span>' : '') +
            '</li>'
          );
        },
        'Aucune facture impayée.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Alertes stock</h2>' +
      listOrEmpty(
        s.materiauxBas,
        function (m) {
          return '<li><a href="#/materiaux">' + esc(m.nom) + '</a> — ' + m.quantite + ' ' + esc(m.unite) + ' (seuil ' + m.seuilAlerte + ')</li>';
        },
        'Tous les stocks sont au-dessus du seuil.'
      ) +
      '</section>' +
      '</div>'
    );
  };

  /* ---- Clients ---- */

  Views.clientsList = function () {
    var list = Data.clients.list().sort(function (a, b) {
      return a.nom.localeCompare(b.nom, 'fr');
    });
    var rows = list
      .map(function (c) {
        return (
          '<tr><td><a href="#/clients/' +
          c.id +
          '">' +
          esc(c.nom) +
          '</a></td><td>' +
          esc(c.entreprise || '—') +
          '</td><td>' +
          esc(c.telephone || '—') +
          '</td><td>' +
          esc(c.email || '—') +
          '</td><td class="actions-cell">' +
          '<a class="btn btn-sm" href="#/clients/' +
          c.id +
          '">Voir</a> ' +
          '<a class="btn btn-sm" href="#/clients/' +
          c.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="clients" data-id="' +
          c.id +
          '" data-redirect="#/clients">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    return (
      pageHeader('Clients', '<a class="btn btn-primary" href="#/clients/new">+ Nouveau client</a>') +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Nom</th><th>Entreprise</th><th>Téléphone</th><th>E-mail</th><th>Actions</th></tr></thead>' +
      '<tbody>' +
      (rows || emptyRow(5, 'Aucun client. Ajoutez votre premier client.')) +
      '</tbody></table></div>'
    );
  };

  Views.clientDetail = function (id) {
    var c = Data.clients.get(id);
    if (!c) return notFoundView();
    var chantiersC = Data.chantiers.list().filter(function (x) {
      return x.clientId === id;
    });
    var devisC = Data.devis.list().filter(function (x) {
      return x.clientId === id;
    });
    var facturesC = Data.factures.list().filter(function (x) {
      return x.clientId === id;
    });
    return (
      pageHeader(
        c.nom,
        '<a class="btn" href="#/clients/' +
          c.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-danger" data-action="delete" data-entity="clients" data-id="' +
          c.id +
          '" data-redirect="#/clients">Supprimer</button> ' +
          '<a class="btn" href="#/clients">← Retour</a>'
      ) +
      '<div class="detail-grid">' +
      '<section class="panel"><h2>Coordonnées</h2><dl class="def-list">' +
      '<dt>Entreprise</dt><dd>' +
      esc(c.entreprise || '—') +
      '</dd>' +
      '<dt>Téléphone</dt><dd>' +
      esc(c.telephone || '—') +
      '</dd>' +
      '<dt>E-mail</dt><dd>' +
      esc(c.email || '—') +
      '</dd>' +
      '<dt>Adresse</dt><dd>' +
      esc(c.adresse || '—') +
      '</dd>' +
      '<dt>Notes</dt><dd>' +
      esc(c.notes || '—') +
      '</dd>' +
      '</dl></section>' +
      '<section class="panel"><h2>Chantiers (' +
      chantiersC.length +
      ')</h2>' +
      listOrEmpty(
        chantiersC,
        function (x) {
          return '<li><a href="#/chantiers/' + x.id + '">' + esc(x.titre) + '</a> ' + statutBadge(Data.STATUTS_CHANTIER, x.statut) + '</li>';
        },
        'Aucun chantier.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Devis (' +
      devisC.length +
      ')</h2>' +
      listOrEmpty(
        devisC,
        function (x) {
          return '<li><a href="#/devis/' + x.id + '">' + esc(x.numero) + '</a> ' + statutBadge(Data.STATUTS_DEVIS, x.statut) + '</li>';
        },
        'Aucun devis.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Factures (' +
      facturesC.length +
      ')</h2>' +
      listOrEmpty(
        facturesC,
        function (x) {
          return '<li><a href="#/factures/' + x.id + '">' + esc(x.numero) + '</a> ' + statutBadge(Data.STATUTS_FACTURE, x.statut) + '</li>';
        },
        'Aucune facture.'
      ) +
      '</section>' +
      '</div>'
    );
  };

  Views.clientForm = function (id) {
    var record = id ? Data.clients.get(id) : null;
    if (id && !record) return notFoundView();
    var r = record || { nom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' };
    return (
      pageHeader(id ? 'Modifier le client' : 'Nouveau client') +
      '<form class="form-card" data-form="client" data-id="' +
      (id || '') +
      '">' +
      '<p class="form-error" hidden></p>' +
      '<label>Nom *<input type="text" name="nom" value="' +
      esc(r.nom) +
      '" required></label>' +
      '<label>Entreprise<input type="text" name="entreprise" value="' +
      esc(r.entreprise) +
      '"></label>' +
      '<label>E-mail<input type="email" name="email" value="' +
      esc(r.email) +
      '"></label>' +
      '<label>Téléphone<input type="text" name="telephone" value="' +
      esc(r.telephone) +
      '"></label>' +
      '<label>Adresse<input type="text" name="adresse" value="' +
      esc(r.adresse) +
      '"></label>' +
      '<label>Notes<textarea name="notes" rows="3">' +
      esc(r.notes) +
      '</textarea></label>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button> ' +
      '<a class="btn" href="' +
      (id ? '#/clients/' + id : '#/clients') +
      '">Annuler</a>' +
      '</div></form>'
    );
  };

  /* ---- Matériaux ---- */

  Views.materiauxList = function () {
    var list = Data.materiaux.list().sort(function (a, b) {
      return a.nom.localeCompare(b.nom, 'fr');
    });
    var rows = list
      .map(function (m) {
        var bas = Number(m.quantite) <= Number(m.seuilAlerte);
        return (
          '<tr class="' +
          (bas ? 'row-alert' : '') +
          '"><td>' +
          esc(m.nom) +
          '</td><td>' +
          m.quantite +
          ' ' +
          esc(m.unite) +
          '</td><td>' +
          m.seuilAlerte +
          ' ' +
          esc(m.unite) +
          '</td><td>' +
          Data.formatMoney(m.prixUnitaire) +
          '</td><td>' +
          (bas ? '<span class="badge badge-en_retard">Stock bas</span>' : '<span class="badge badge-ok">OK</span>') +
          '</td><td class="actions-cell">' +
          '<a class="btn btn-sm" href="#/materiaux/' +
          m.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="materiaux" data-id="' +
          m.id +
          '" data-redirect="#/materiaux">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    return (
      pageHeader('Matériaux / Stock', '<a class="btn btn-primary" href="#/materiaux/new">+ Nouveau matériau</a>') +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Nom</th><th>Quantité</th><th>Seuil d’alerte</th><th>Prix unitaire</th><th>Statut</th><th>Actions</th></tr></thead>' +
      '<tbody>' +
      (rows || emptyRow(6, 'Aucun matériau enregistré.')) +
      '</tbody></table></div>'
    );
  };

  Views.materiauForm = function (id) {
    var record = id ? Data.materiaux.get(id) : null;
    if (id && !record) return notFoundView();
    var r = record || { nom: '', quantite: 0, unite: '', seuilAlerte: 0, prixUnitaire: 0 };
    return (
      pageHeader(id ? 'Modifier le matériau' : 'Nouveau matériau') +
      '<form class="form-card" data-form="materiau" data-id="' +
      (id || '') +
      '">' +
      '<p class="form-error" hidden></p>' +
      '<label>Nom *<input type="text" name="nom" value="' +
      esc(r.nom) +
      '" required></label>' +
      '<div class="form-row">' +
      '<label>Quantité en stock<input type="number" name="quantite" value="' +
      r.quantite +
      '" min="0" step="0.01"></label>' +
      '<label>Unité<input type="text" name="unite" value="' +
      esc(r.unite) +
      '" placeholder="m², L, boîte…"></label>' +
      '</div>' +
      '<div class="form-row">' +
      '<label>Seuil d’alerte<input type="number" name="seuilAlerte" value="' +
      r.seuilAlerte +
      '" min="0" step="0.01"></label>' +
      '<label>Prix unitaire (€)<input type="number" name="prixUnitaire" value="' +
      r.prixUnitaire +
      '" min="0" step="0.01"></label>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button> ' +
      '<a class="btn" href="#/materiaux">Annuler</a>' +
      '</div></form>'
    );
  };

  /* ---- Chantiers ---- */

  function chantierStatutSelect(c) {
    var opts = Object.keys(Data.STATUTS_CHANTIER)
      .map(function (k) {
        return '<option value="' + k + '"' + (k === c.statut ? ' selected' : '') + '>' + Data.STATUTS_CHANTIER[k] + '</option>';
      })
      .join('');
    return '<select data-action="chantier-status" data-id="' + c.id + '">' + opts + '</select>';
  }

  Views.chantiersList = function () {
    var list = Data.chantiers.list().sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    var rows = list
      .map(function (c) {
        return (
          '<tr><td><a href="#/chantiers/' +
          c.id +
          '">' +
          esc(c.titre) +
          '</a></td><td>' +
          esc(clientLabel(c.clientId)) +
          '</td><td>' +
          chantierStatutSelect(c) +
          '</td><td>' +
          Data.formatDate(c.dateDebut) +
          '</td><td>' +
          Data.formatDate(c.dateFin) +
          '</td><td class="actions-cell">' +
          '<a class="btn btn-sm" href="#/chantiers/' +
          c.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="chantiers" data-id="' +
          c.id +
          '" data-redirect="#/chantiers">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    return (
      pageHeader('Chantiers', '<a class="btn btn-primary" href="#/chantiers/new">+ Nouveau chantier</a>') +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Titre</th><th>Client</th><th>Statut</th><th>Début</th><th>Fin</th><th>Actions</th></tr></thead>' +
      '<tbody>' +
      (rows || emptyRow(6, 'Aucun chantier. Ajoutez votre premier chantier.')) +
      '</tbody></table></div>'
    );
  };

  Views.chantierDetail = function (id) {
    var c = Data.chantiers.get(id);
    if (!c) return notFoundView();
    var devisC = Data.devis.list().filter(function (x) {
      return x.chantierId === id;
    });
    var facturesC = Data.factures.list().filter(function (x) {
      return x.chantierId === id;
    });
    return (
      pageHeader(
        c.titre,
        '<a class="btn" href="#/chantiers/' +
          c.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-danger" data-action="delete" data-entity="chantiers" data-id="' +
          c.id +
          '" data-redirect="#/chantiers">Supprimer</button> ' +
          '<a class="btn" href="#/chantiers">← Retour</a>'
      ) +
      '<div class="detail-grid">' +
      '<section class="panel"><h2>Informations</h2><dl class="def-list">' +
      '<dt>Client</dt><dd><a href="#/clients/' +
      c.clientId +
      '">' +
      esc(clientLabel(c.clientId)) +
      '</a></dd>' +
      '<dt>Statut</dt><dd>' +
      chantierStatutSelect(c) +
      '</dd>' +
      '<dt>Adresse</dt><dd>' +
      esc(c.adresse || '—') +
      '</dd>' +
      '<dt>Début</dt><dd>' +
      Data.formatDate(c.dateDebut) +
      '</dd>' +
      '<dt>Fin</dt><dd>' +
      Data.formatDate(c.dateFin) +
      '</dd>' +
      '<dt>Description</dt><dd>' +
      esc(c.description || '—') +
      '</dd>' +
      '</dl></section>' +
      '<section class="panel"><h2>Devis (' +
      devisC.length +
      ')</h2>' +
      listOrEmpty(
        devisC,
        function (x) {
          return '<li><a href="#/devis/' + x.id + '">' + esc(x.numero) + '</a> ' + statutBadge(Data.STATUTS_DEVIS, x.statut) + '</li>';
        },
        'Aucun devis.'
      ) +
      '</section>' +
      '<section class="panel"><h2>Factures (' +
      facturesC.length +
      ')</h2>' +
      listOrEmpty(
        facturesC,
        function (x) {
          return '<li><a href="#/factures/' + x.id + '">' + esc(x.numero) + '</a> ' + statutBadge(Data.STATUTS_FACTURE, x.statut) + '</li>';
        },
        'Aucune facture.'
      ) +
      '</section>' +
      '</div>'
    );
  };

  Views.chantierForm = function (id) {
    var record = id ? Data.chantiers.get(id) : null;
    if (id && !record) return notFoundView();
    var r = record || { titre: '', clientId: '', adresse: '', statut: 'en_attente', dateDebut: '', dateFin: '', description: '' };
    var statutOptions = Object.keys(Data.STATUTS_CHANTIER)
      .map(function (k) {
        return '<option value="' + k + '"' + (k === r.statut ? ' selected' : '') + '>' + Data.STATUTS_CHANTIER[k] + '</option>';
      })
      .join('');
    return (
      pageHeader(id ? 'Modifier le chantier' : 'Nouveau chantier') +
      '<form class="form-card" data-form="chantier" data-id="' +
      (id || '') +
      '">' +
      '<p class="form-error" hidden></p>' +
      '<label>Titre *<input type="text" name="titre" value="' +
      esc(r.titre) +
      '" required></label>' +
      '<label>Client *<select name="clientId" required><option value="">— Choisir —</option>' +
      clientOptionsHtml(r.clientId) +
      '</select></label>' +
      '<label>Adresse<input type="text" name="adresse" value="' +
      esc(r.adresse) +
      '"></label>' +
      '<label>Statut<select name="statut">' +
      statutOptions +
      '</select></label>' +
      '<div class="form-row">' +
      '<label>Date de début<input type="date" name="dateDebut" value="' +
      (r.dateDebut || '') +
      '"></label>' +
      '<label>Date de fin<input type="date" name="dateFin" value="' +
      (r.dateFin || '') +
      '"></label>' +
      '</div>' +
      '<label>Description<textarea name="description" rows="3">' +
      esc(r.description) +
      '</textarea></label>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button> ' +
      '<a class="btn" href="' +
      (id ? '#/chantiers/' + id : '#/chantiers') +
      '">Annuler</a>' +
      '</div></form>'
    );
  };

  /* ---- Devis ---- */

  Views.devisList = function () {
    var list = Data.devis.list().sort(function (a, b) {
      return (b.dateCreation || '').localeCompare(a.dateCreation || '');
    });
    var rows = list
      .map(function (d) {
        var totals = Data.computeTotaux(d.lignes, d.tauxTva);
        return (
          '<tr><td><a href="#/devis/' +
          d.id +
          '">' +
          esc(d.numero) +
          '</a></td><td>' +
          esc(clientLabel(d.clientId)) +
          '</td><td>' +
          Data.formatDate(d.dateCreation) +
          '</td><td>' +
          statutBadge(Data.STATUTS_DEVIS, d.statut) +
          '</td><td>' +
          Data.formatMoney(totals.totalTtc) +
          '</td><td class="actions-cell">' +
          '<a class="btn btn-sm" href="#/devis/' +
          d.id +
          '">Voir</a> ' +
          '<a class="btn btn-sm" href="#/devis/' +
          d.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="devis" data-id="' +
          d.id +
          '" data-redirect="#/devis">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    return (
      pageHeader('Devis', '<a class="btn btn-primary" href="#/devis/new">+ Nouveau devis</a>') +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Numéro</th><th>Client</th><th>Date</th><th>Statut</th><th>Total TTC</th><th>Actions</th></tr></thead>' +
      '<tbody>' +
      (rows || emptyRow(6, 'Aucun devis. Créez votre premier devis.')) +
      '</tbody></table></div>'
    );
  };

  Views.devisDetail = function (id) {
    var d = Data.devis.get(id);
    if (!d) return notFoundView();
    var totals = Data.computeTotaux(d.lignes, d.tauxTva);
    var client = Data.clients.get(d.clientId);
    var chantier = d.chantierId ? Data.chantiers.get(d.chantierId) : null;
    var lignesRows = (d.lignes || [])
      .map(function (l) {
        return (
          '<tr><td>' +
          esc(l.description) +
          '</td><td>' +
          l.quantite +
          '</td><td>' +
          esc(l.unite || '') +
          '</td><td>' +
          Data.formatMoney(l.prixUnitaire) +
          '</td><td>' +
          Data.formatMoney(Data.computeLigneTotal(l)) +
          '</td></tr>'
        );
      })
      .join('');

    var statusActions = '';
    if (d.statut === 'brouillon') statusActions += actionBtn('Marquer comme envoyé', 'devis-status', d.id, 'envoye');
    if (d.statut === 'envoye') {
      statusActions += actionBtn('Marquer comme accepté', 'devis-status', d.id, 'accepte');
      statusActions += actionBtn('Marquer comme refusé', 'devis-status', d.id, 'refuse');
    }
    if (d.statut === 'accepte') {
      var facLink = d.factureId && Data.factures.get(d.factureId);
      if (facLink) {
        statusActions += '<a class="btn btn-sm" href="#/factures/' + facLink.id + '">Voir la facture ' + esc(facLink.numero) + '</a>';
      } else {
        statusActions += '<button type="button" class="btn btn-sm btn-primary" data-action="convert-to-facture" data-id="' + d.id + '">Convertir en facture</button>';
      }
    }

    return (
      '<div class="document">' +
      pageHeader(
        'Devis ' + d.numero,
        '<button type="button" class="btn" data-action="print">Imprimer</button> ' +
          '<a class="btn" href="#/devis/' +
          d.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-danger" data-action="delete" data-entity="devis" data-id="' +
          d.id +
          '" data-redirect="#/devis">Supprimer</button> ' +
          '<a class="btn" href="#/devis">← Retour</a>'
      ) +
      '<div class="document-meta">' +
      statutBadge(Data.STATUTS_DEVIS, d.statut) +
      ' <span class="status-actions">' +
      statusActions +
      '</span>' +
      '</div>' +
      '<div class="print-area">' +
      '<div class="doc-header">' +
      '<div><h2>Devis ' +
      esc(d.numero) +
      '</h2><p>Date : ' +
      Data.formatDate(d.dateCreation) +
      ' — Valable jusqu’au ' +
      Data.formatDate(d.dateValidite) +
      '</p></div>' +
      '<div class="doc-client"><strong>Client</strong><br>' +
      (client ? esc(client.nom) : 'Client supprimé') +
      (client && client.entreprise ? '<br>' + esc(client.entreprise) : '') +
      (client && client.adresse ? '<br>' + esc(client.adresse) : '') +
      '</div></div>' +
      (chantier ? '<p><strong>Chantier :</strong> <a href="#/chantiers/' + chantier.id + '">' + esc(chantier.titre) + '</a></p>' : '') +
      '<div class="table-wrap"><table class="data-table doc-table">' +
      '<thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th></tr></thead>' +
      '<tbody>' +
      (lignesRows || emptyRow(5, 'Aucune ligne.')) +
      '</tbody></table></div>' +
      '<table class="totals-table">' +
      '<tr><td>Total HT</td><td>' +
      Data.formatMoney(totals.totalHt) +
      '</td></tr>' +
      '<tr><td>TVA (' +
      d.tauxTva +
      '%)</td><td>' +
      Data.formatMoney(totals.totalTva) +
      '</td></tr>' +
      '<tr class="grand-total"><td>Total TTC</td><td>' +
      Data.formatMoney(totals.totalTtc) +
      '</td></tr>' +
      '</table>' +
      (d.notes ? '<p class="doc-notes"><strong>Notes :</strong> ' + esc(d.notes) + '</p>' : '') +
      '</div></div>'
    );
  };

  Views.devisForm = function (id) {
    var record = id ? Data.devis.get(id) : null;
    if (id && !record) return notFoundView();
    var r =
      record ||
      {
        clientId: '',
        chantierId: '',
        dateCreation: Data.todayISO(),
        dateValidite: Data.addDaysISO(Data.todayISO(), 30),
        tauxTva: 20,
        lignes: [{ description: '', quantite: 1, unite: '', prixUnitaire: 0 }],
        notes: '',
      };
    return (
      pageHeader(id ? 'Modifier le devis' : 'Nouveau devis') +
      '<form class="form-card" data-form="devis" data-id="' +
      (id || '') +
      '">' +
      '<p class="form-error" hidden></p>' +
      '<div class="form-row">' +
      '<label>Client *<select name="clientId" required><option value="">— Choisir —</option>' +
      clientOptionsHtml(r.clientId) +
      '</select></label>' +
      '<label>Chantier<select name="chantierId"><option value="">Aucun</option>' +
      chantierOptionsHtml(r.chantierId) +
      '</select></label>' +
      '</div>' +
      '<div class="form-row">' +
      '<label>Date de création<input type="date" name="dateCreation" value="' +
      (r.dateCreation || '') +
      '"></label>' +
      '<label>Valable jusqu’au<input type="date" name="dateValidite" value="' +
      (r.dateValidite || '') +
      '"></label>' +
      '<label>TVA (%)<input type="number" id="f-tauxTva" name="tauxTva" value="' +
      r.tauxTva +
      '" min="0" step="0.1"></label>' +
      '</div>' +
      lignesEditorHtml(r.lignes) +
      '<label>Notes<textarea name="notes" rows="2">' +
      esc(r.notes) +
      '</textarea></label>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button> ' +
      '<a class="btn" href="' +
      (id ? '#/devis/' + id : '#/devis') +
      '">Annuler</a>' +
      '</div></form>'
    );
  };

  /* ---- Factures ---- */

  Views.facturesList = function () {
    var list = Data.factures.list().sort(function (a, b) {
      return (b.dateEmission || '').localeCompare(a.dateEmission || '');
    });
    var rows = list
      .map(function (f) {
        var totals = Data.computeTotaux(f.lignes, f.tauxTva);
        var retard = Data.isFactureEnRetard(f);
        return (
          '<tr><td><a href="#/factures/' +
          f.id +
          '">' +
          esc(f.numero) +
          '</a></td><td>' +
          esc(clientLabel(f.clientId)) +
          '</td><td>' +
          Data.formatDate(f.dateEmission) +
          '</td><td>' +
          Data.formatDate(f.dateEcheance) +
          '</td><td>' +
          statutBadge(Data.STATUTS_FACTURE, f.statut) +
          (retard ? ' <span class="badge badge-en_retard">En retard</span>' : '') +
          '</td><td>' +
          Data.formatMoney(totals.totalTtc) +
          '</td><td class="actions-cell">' +
          '<a class="btn btn-sm" href="#/factures/' +
          f.id +
          '">Voir</a> ' +
          '<a class="btn btn-sm" href="#/factures/' +
          f.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="factures" data-id="' +
          f.id +
          '" data-redirect="#/factures">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    return (
      pageHeader('Factures', '<a class="btn btn-primary" href="#/factures/new">+ Nouvelle facture</a>') +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Numéro</th><th>Client</th><th>Émission</th><th>Échéance</th><th>Statut</th><th>Total TTC</th><th>Actions</th></tr></thead>' +
      '<tbody>' +
      (rows || emptyRow(7, 'Aucune facture.')) +
      '</tbody></table></div>'
    );
  };

  Views.factureDetail = function (id) {
    var f = Data.factures.get(id);
    if (!f) return notFoundView();
    var totals = Data.computeTotaux(f.lignes, f.tauxTva);
    var client = Data.clients.get(f.clientId);
    var chantier = f.chantierId ? Data.chantiers.get(f.chantierId) : null;
    var devisOrigine = f.devisId ? Data.devis.get(f.devisId) : null;
    var retard = Data.isFactureEnRetard(f);
    var lignesRows = (f.lignes || [])
      .map(function (l) {
        return (
          '<tr><td>' +
          esc(l.description) +
          '</td><td>' +
          l.quantite +
          '</td><td>' +
          esc(l.unite || '') +
          '</td><td>' +
          Data.formatMoney(l.prixUnitaire) +
          '</td><td>' +
          Data.formatMoney(Data.computeLigneTotal(l)) +
          '</td></tr>'
        );
      })
      .join('');

    var statusActions =
      f.statut === 'impayee'
        ? actionBtn('Marquer comme payée', 'facture-status', f.id, 'payee')
        : actionBtn('Marquer comme impayée', 'facture-status', f.id, 'impayee');

    return (
      '<div class="document">' +
      pageHeader(
        'Facture ' + f.numero,
        '<button type="button" class="btn" data-action="print">Imprimer</button> ' +
          '<a class="btn" href="#/factures/' +
          f.id +
          '/edit">Modifier</a> ' +
          '<button type="button" class="btn btn-danger" data-action="delete" data-entity="factures" data-id="' +
          f.id +
          '" data-redirect="#/factures">Supprimer</button> ' +
          '<a class="btn" href="#/factures">← Retour</a>'
      ) +
      (retard ? '<p class="alert-banner">Cette facture est en retard de paiement.</p> ' : '') +
      '<div class="document-meta">' +
      statutBadge(Data.STATUTS_FACTURE, f.statut) +
      ' <span class="status-actions">' +
      statusActions +
      '</span>' +
      (devisOrigine ? ' <a class="btn btn-sm" href="#/devis/' + devisOrigine.id + '">Devis d’origine : ' + esc(devisOrigine.numero) + '</a>' : '') +
      '</div>' +
      '<div class="print-area">' +
      '<div class="doc-header">' +
      '<div><h2>Facture ' +
      esc(f.numero) +
      '</h2><p>Émise le ' +
      Data.formatDate(f.dateEmission) +
      ' — Échéance : ' +
      Data.formatDate(f.dateEcheance) +
      '</p></div>' +
      '<div class="doc-client"><strong>Client</strong><br>' +
      (client ? esc(client.nom) : 'Client supprimé') +
      (client && client.entreprise ? '<br>' + esc(client.entreprise) : '') +
      (client && client.adresse ? '<br>' + esc(client.adresse) : '') +
      '</div></div>' +
      (chantier ? '<p><strong>Chantier :</strong> <a href="#/chantiers/' + chantier.id + '">' + esc(chantier.titre) + '</a></p>' : '') +
      '<div class="table-wrap"><table class="data-table doc-table">' +
      '<thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th></tr></thead>' +
      '<tbody>' +
      (lignesRows || emptyRow(5, 'Aucune ligne.')) +
      '</tbody></table></div>' +
      '<table class="totals-table">' +
      '<tr><td>Total HT</td><td>' +
      Data.formatMoney(totals.totalHt) +
      '</td></tr>' +
      '<tr><td>TVA (' +
      f.tauxTva +
      '%)</td><td>' +
      Data.formatMoney(totals.totalTva) +
      '</td></tr>' +
      '<tr class="grand-total"><td>Total TTC</td><td>' +
      Data.formatMoney(totals.totalTtc) +
      '</td></tr>' +
      '</table>' +
      (f.notes ? '<p class="doc-notes"><strong>Notes :</strong> ' + esc(f.notes) + '</p>' : '') +
      '</div></div>'
    );
  };

  Views.factureForm = function (id) {
    var record = id ? Data.factures.get(id) : null;
    if (id && !record) return notFoundView();
    var r =
      record ||
      {
        clientId: '',
        chantierId: '',
        dateEmission: Data.todayISO(),
        dateEcheance: Data.addDaysISO(Data.todayISO(), 30),
        tauxTva: 20,
        lignes: [{ description: '', quantite: 1, unite: '', prixUnitaire: 0 }],
        notes: '',
      };
    return (
      pageHeader(id ? 'Modifier la facture' : 'Nouvelle facture') +
      '<form class="form-card" data-form="facture" data-id="' +
      (id || '') +
      '">' +
      '<p class="form-error" hidden></p>' +
      '<div class="form-row">' +
      '<label>Client *<select name="clientId" required><option value="">— Choisir —</option>' +
      clientOptionsHtml(r.clientId) +
      '</select></label>' +
      '<label>Chantier<select name="chantierId"><option value="">Aucun</option>' +
      chantierOptionsHtml(r.chantierId) +
      '</select></label>' +
      '</div>' +
      '<div class="form-row">' +
      '<label>Date d’émission<input type="date" name="dateEmission" value="' +
      (r.dateEmission || '') +
      '"></label>' +
      '<label>Date d’échéance<input type="date" name="dateEcheance" value="' +
      (r.dateEcheance || '') +
      '"></label>' +
      '<label>TVA (%)<input type="number" id="f-tauxTva" name="tauxTva" value="' +
      r.tauxTva +
      '" min="0" step="0.1"></label>' +
      '</div>' +
      lignesEditorHtml(r.lignes) +
      '<label>Notes<textarea name="notes" rows="2">' +
      esc(r.notes) +
      '</textarea></label>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button> ' +
      '<a class="btn" href="' +
      (id ? '#/factures/' + id : '#/factures') +
      '">Annuler</a>' +
      '</div></form>'
    );
  };

  /* ---- Paramètres ---- */

  Views.parametres = function () {
    return (
      pageHeader('Paramètres') +
      '<div class="detail-grid">' +
      '<section class="panel"><h2>Sauvegarde</h2>' +
      '<p>Toutes les données sont stockées uniquement dans ce navigateur (localStorage). Exportez-les régulièrement pour ne rien perdre, par exemple avant de vider le cache du navigateur.</p>' +
      '<button type="button" class="btn" data-action="export-json">Exporter les données (JSON)</button>' +
      '<div class="import-row">' +
      '<label class="btn" for="import-file">Importer un fichier JSON</label>' +
      '<input type="file" id="import-file" accept="application/json" data-action="import-json" hidden>' +
      '</div></section>' +
      '<section class="panel"><h2>Zone sensible</h2>' +
      '<button type="button" class="btn" data-action="reset-demo">Réinitialiser avec les données de démonstration</button> ' +
      '<button type="button" class="btn btn-danger" data-action="wipe-all">Vider toutes les données</button>' +
      '</section></div>'
    );
  };

  /* ---------------------------------------------------------------- */
  /* Routeur                                                            */
  /* ---------------------------------------------------------------- */

  var ROUTES = [
    { re: /^$/, view: Views.dashboard },
    { re: /^dashboard$/, view: Views.dashboard },
    { re: /^clients$/, view: Views.clientsList },
    { re: /^clients\/new$/, view: function () { return Views.clientForm(null); } },
    { re: /^clients\/([^/]+)\/edit$/, view: function (m) { return Views.clientForm(m[1]); } },
    { re: /^clients\/([^/]+)$/, view: function (m) { return Views.clientDetail(m[1]); } },
    { re: /^materiaux$/, view: Views.materiauxList },
    { re: /^materiaux\/new$/, view: function () { return Views.materiauForm(null); } },
    { re: /^materiaux\/([^/]+)\/edit$/, view: function (m) { return Views.materiauForm(m[1]); } },
    { re: /^chantiers$/, view: Views.chantiersList },
    { re: /^chantiers\/new$/, view: function () { return Views.chantierForm(null); } },
    { re: /^chantiers\/([^/]+)\/edit$/, view: function (m) { return Views.chantierForm(m[1]); } },
    { re: /^chantiers\/([^/]+)$/, view: function (m) { return Views.chantierDetail(m[1]); } },
    { re: /^devis$/, view: Views.devisList },
    { re: /^devis\/new$/, view: function () { return Views.devisForm(null); } },
    { re: /^devis\/([^/]+)\/edit$/, view: function (m) { return Views.devisForm(m[1]); } },
    { re: /^devis\/([^/]+)$/, view: function (m) { return Views.devisDetail(m[1]); } },
    { re: /^factures$/, view: Views.facturesList },
    { re: /^factures\/new$/, view: function () { return Views.factureForm(null); } },
    { re: /^factures\/([^/]+)\/edit$/, view: function (m) { return Views.factureForm(m[1]); } },
    { re: /^factures\/([^/]+)$/, view: function (m) { return Views.factureDetail(m[1]); } },
    { re: /^parametres$/, view: Views.parametres },
  ];

  function currentHash() {
    return location.hash.replace(/^#\/?/, '');
  }

  function render() {
    var hash = currentHash();
    var root = document.getElementById('view-root');
    var matched = null;
    var match = null;
    for (var i = 0; i < ROUTES.length; i++) {
      match = ROUTES[i].re.exec(hash);
      if (match) {
        matched = ROUTES[i];
        break;
      }
    }
    root.innerHTML = matched ? matched.view(match) : notFoundView();
    var section = hash.split('/')[0] || 'dashboard';
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.classList.toggle('active', link.dataset.section === section);
    });
    document.getElementById('sidebar').classList.remove('open');
    recomputeLigneTotals();
    window.scrollTo(0, 0);
  }

  function navigate(hash) {
    if (location.hash === hash) {
      render();
    } else {
      location.hash = hash;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Lignes dynamiques (devis / factures)                              */
  /* ---------------------------------------------------------------- */

  function recomputeLigneTotals() {
    var body = document.getElementById('lignes-body');
    if (!body) return;
    var ht = 0;
    body.querySelectorAll('.ligne-row').forEach(function (row) {
      var qte = parseFloat(row.querySelector('.f-quantite').value) || 0;
      var prix = parseFloat(row.querySelector('.f-prix').value) || 0;
      var total = qte * prix;
      ht += total;
      row.querySelector('.ligne-total').textContent = Data.formatMoney(total);
    });
    var tauxInput = document.getElementById('f-tauxTva');
    var taux = tauxInput ? parseFloat(tauxInput.value) || 0 : 0;
    var tva = (ht * taux) / 100;
    var ttc = ht + tva;
    var elHt = document.getElementById('total-ht');
    var elTva = document.getElementById('total-tva');
    var elTtc = document.getElementById('total-ttc');
    if (elHt) elHt.textContent = Data.formatMoney(ht);
    if (elTva) elTva.textContent = Data.formatMoney(tva);
    if (elTtc) elTtc.textContent = Data.formatMoney(ttc);
  }

  function collectLignes(form) {
    var lignes = [];
    form.querySelectorAll('.ligne-row').forEach(function (row) {
      var description = row.querySelector('.f-description').value.trim();
      var quantite = parseFloat(row.querySelector('.f-quantite').value) || 0;
      var unite = row.querySelector('.f-unite').value.trim();
      var prixUnitaire = parseFloat(row.querySelector('.f-prix').value) || 0;
      if (description) lignes.push({ description: description, quantite: quantite, unite: unite, prixUnitaire: prixUnitaire });
    });
    return lignes;
  }

  /* ---------------------------------------------------------------- */
  /* Notifications                                                      */
  /* ---------------------------------------------------------------- */

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2500);
  }

  function showFormError(form, msg) {
    var box = form.querySelector('.form-error');
    if (box) {
      box.textContent = msg;
      box.hidden = false;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Soumission des formulaires                                        */
  /* ---------------------------------------------------------------- */

  function handleClientForm(form) {
    var data = {
      nom: form.nom.value.trim(),
      entreprise: form.entreprise.value.trim(),
      email: form.email.value.trim(),
      telephone: form.telephone.value.trim(),
      adresse: form.adresse.value.trim(),
      notes: form.notes.value.trim(),
    };
    if (!data.nom) {
      showFormError(form, 'Le nom est obligatoire.');
      return;
    }
    var id = form.dataset.id;
    var record = id ? Data.clients.update(id, data) : Data.clients.create(data);
    toast(id ? 'Client mis à jour.' : 'Client créé.');
    navigate('#/clients/' + record.id);
  }

  function handleMateriauForm(form) {
    var data = {
      nom: form.nom.value.trim(),
      quantite: parseFloat(form.quantite.value) || 0,
      unite: form.unite.value.trim(),
      seuilAlerte: parseFloat(form.seuilAlerte.value) || 0,
      prixUnitaire: parseFloat(form.prixUnitaire.value) || 0,
    };
    if (!data.nom) {
      showFormError(form, 'Le nom est obligatoire.');
      return;
    }
    var id = form.dataset.id;
    if (id) Data.materiaux.update(id, data);
    else Data.materiaux.create(data);
    toast(id ? 'Matériau mis à jour.' : 'Matériau créé.');
    navigate('#/materiaux');
  }

  function handleChantierForm(form) {
    var data = {
      titre: form.titre.value.trim(),
      clientId: form.clientId.value,
      adresse: form.adresse.value.trim(),
      statut: form.statut.value,
      dateDebut: form.dateDebut.value,
      dateFin: form.dateFin.value,
      description: form.description.value.trim(),
    };
    if (!data.titre || !data.clientId) {
      showFormError(form, 'Le titre et le client sont obligatoires.');
      return;
    }
    var id = form.dataset.id;
    var record = id ? Data.chantiers.update(id, data) : Data.chantiers.create(data);
    toast(id ? 'Chantier mis à jour.' : 'Chantier créé.');
    navigate('#/chantiers/' + record.id);
  }

  function handleDevisForm(form) {
    var clientId = form.clientId.value;
    if (!clientId) {
      showFormError(form, 'Le client est obligatoire.');
      return;
    }
    var lignes = collectLignes(form);
    if (!lignes.length) {
      showFormError(form, 'Ajoutez au moins une ligne avec une description.');
      return;
    }
    var data = {
      clientId: clientId,
      chantierId: form.chantierId.value || '',
      dateCreation: form.dateCreation.value || Data.todayISO(),
      dateValidite: form.dateValidite.value || '',
      tauxTva: parseFloat(form.tauxTva.value) || 0,
      lignes: lignes,
      notes: form.notes.value.trim(),
    };
    var id = form.dataset.id;
    if (id) {
      Data.devis.update(id, data);
      toast('Devis mis à jour.');
      navigate('#/devis/' + id);
    } else {
      data.statut = 'brouillon';
      var record = Data.devis.create(data);
      toast('Devis créé.');
      navigate('#/devis/' + record.id);
    }
  }

  function handleFactureForm(form) {
    var clientId = form.clientId.value;
    if (!clientId) {
      showFormError(form, 'Le client est obligatoire.');
      return;
    }
    var lignes = collectLignes(form);
    if (!lignes.length) {
      showFormError(form, 'Ajoutez au moins une ligne avec une description.');
      return;
    }
    var id = form.dataset.id;
    var existing = id ? Data.factures.get(id) : null;
    var data = {
      clientId: clientId,
      chantierId: form.chantierId.value || '',
      dateEmission: form.dateEmission.value || Data.todayISO(),
      dateEcheance: form.dateEcheance.value || '',
      tauxTva: parseFloat(form.tauxTva.value) || 0,
      lignes: lignes,
      notes: form.notes.value.trim(),
      devisId: existing ? existing.devisId : '',
    };
    if (id) {
      Data.factures.update(id, data);
      toast('Facture mise à jour.');
      navigate('#/factures/' + id);
    } else {
      data.statut = 'impayee';
      var record = Data.factures.create(data);
      toast('Facture créée.');
      navigate('#/factures/' + record.id);
    }
  }

  function convertDevisToFacture(devisId) {
    var d = Data.devis.get(devisId);
    if (!d) return;
    var facture = Data.factures.create({
      clientId: d.clientId,
      chantierId: d.chantierId,
      devisId: d.id,
      statut: 'impayee',
      dateEmission: Data.todayISO(),
      dateEcheance: Data.addDaysISO(Data.todayISO(), 30),
      tauxTva: d.tauxTva,
      lignes: d.lignes,
      notes: d.notes,
    });
    Data.devis.update(d.id, { factureId: facture.id });
    toast('Facture ' + facture.numero + ' créée à partir du devis.');
    navigate('#/factures/' + facture.id);
  }

  /* ---------------------------------------------------------------- */
  /* Import / export / réinitialisation                                 */
  /* ---------------------------------------------------------------- */

  function exportJSON() {
    var blob = new Blob([Data.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'menuiserie-donnees-' + Data.todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Export téléchargé.');
  }

  function handleImportFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Data.importJSON(reader.result);
        toast('Données importées.');
        render();
      } catch (e) {
        alert('Fichier invalide : ' + e.message);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  /* ---------------------------------------------------------------- */
  /* Délégation d'événements                                            */
  /* ---------------------------------------------------------------- */

  function handleDelete(el) {
    var entity = el.dataset.entity;
    var id = el.dataset.id;
    var redirect = el.dataset.redirect;
    if (!window.confirm('Confirmer la suppression ? Cette action est irréversible.')) return;
    Data[entity].remove(id);
    toast('Élément supprimé.');
    if (redirect) navigate(redirect);
    else render();
  }

  function onClick(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.dataset.action;
    if (action === 'delete') handleDelete(target);
    else if (action === 'print') window.print();
    else if (action === 'devis-status') {
      Data.devis.update(target.dataset.id, { statut: target.dataset.status });
      toast('Statut du devis mis à jour.');
      render();
    } else if (action === 'facture-status') {
      Data.factures.update(target.dataset.id, { statut: target.dataset.status });
      toast('Statut de la facture mis à jour.');
      render();
    } else if (action === 'convert-to-facture') {
      convertDevisToFacture(target.dataset.id);
    } else if (action === 'add-ligne') {
      var body = document.getElementById('lignes-body');
      if (body) {
        body.insertAdjacentHTML('beforeend', ligneRowHtml({ description: '', quantite: 1, unite: '', prixUnitaire: 0 }));
        recomputeLigneTotals();
      }
    } else if (action === 'remove-ligne') {
      var row = target.closest('tr');
      if (row) row.remove();
      recomputeLigneTotals();
    } else if (action === 'export-json') {
      exportJSON();
    } else if (action === 'reset-demo') {
      if (window.confirm('Remplacer toutes les données actuelles par les données de démonstration ?')) {
        Data.resetDemo();
        toast('Données de démonstration restaurées.');
        render();
      }
    } else if (action === 'wipe-all') {
      if (window.confirm('Supprimer définitivement toutes les données (clients, chantiers, devis, factures, matériaux) ? Cette action est irréversible.')) {
        Data.wipeAll();
        toast('Toutes les données ont été supprimées.');
        render();
      }
    }
  }

  function onChange(e) {
    if (e.target.matches('[data-action="import-json"]')) {
      handleImportFile(e.target);
    } else if (e.target.matches('[data-action="chantier-status"]')) {
      Data.chantiers.update(e.target.dataset.id, { statut: e.target.value });
      toast('Statut du chantier mis à jour.');
      render();
    }
  }

  function onInput(e) {
    if (e.target.closest('#lignes-table') || e.target.id === 'f-tauxTva') {
      recomputeLigneTotals();
    }
  }

  function onSubmit(e) {
    var form = e.target;
    if (!form.matches('[data-form]')) return;
    e.preventDefault();
    var type = form.dataset.form;
    if (type === 'client') handleClientForm(form);
    else if (type === 'materiau') handleMateriauForm(form);
    else if (type === 'chantier') handleChantierForm(form);
    else if (type === 'devis') handleDevisForm(form);
    else if (type === 'facture') handleFactureForm(form);
  }

  /* ---------------------------------------------------------------- */
  /* Initialisation                                                     */
  /* ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('view-root');
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    root.addEventListener('submit', onSubmit);

    document.getElementById('nav-toggle').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });

    window.addEventListener('hashchange', render);

    if (!location.hash) {
      location.hash = '#/dashboard';
    } else {
      render();
    }
  });
})();

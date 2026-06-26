const db = require('./index');
const { computeLignesEtTotaux } = require('./utils');
const devisDb = require('./devis');

const baseSelect = `
  SELECT factures.*, clients.nom AS client_nom, chantiers.titre AS chantier_titre
  FROM factures
  JOIN clients ON clients.id = factures.client_id
  LEFT JOIN chantiers ON chantiers.id = factures.chantier_id
`;

const listStmt = db.prepare(`${baseSelect} ORDER BY factures.date_emission DESC`);
const getByIdStmt = db.prepare(`${baseSelect} WHERE factures.id = ?`);
const listByClientStmt = db.prepare(
  `${baseSelect} WHERE factures.client_id = ? ORDER BY factures.date_emission DESC`
);
const listByChantierStmt = db.prepare(
  `${baseSelect} WHERE factures.chantier_id = ? ORDER BY factures.date_emission DESC`
);
const countUnpaidStmt = db.prepare("SELECT COUNT(*) AS n FROM factures WHERE statut != 'payee'");
const countOverdueStmt = db.prepare(`
  SELECT COUNT(*) AS n FROM factures
  WHERE statut != 'payee' AND date_echeance IS NOT NULL AND date_echeance < date('now')
`);
const findByDevisIdStmt = db.prepare('SELECT id FROM factures WHERE devis_id = ? LIMIT 1');

const getLignesStmt = db.prepare('SELECT * FROM facture_lignes WHERE facture_id = ? ORDER BY id');
const insertLigneStmt = db.prepare(`
  INSERT INTO facture_lignes (facture_id, description, quantite, unite, prix_unitaire, total)
  VALUES (@facture_id, @description, @quantite, @unite, @prix_unitaire, @total)
`);
const deleteLignesStmt = db.prepare('DELETE FROM facture_lignes WHERE facture_id = ?');

const insertFactureStmt = db.prepare(`
  INSERT INTO factures
    (client_id, chantier_id, devis_id, statut, date_echeance, taux_tva,
     total_ht, total_tva, total_ttc, notes)
  VALUES
    (@client_id, @chantier_id, @devis_id, @statut, @date_echeance, @taux_tva,
     @total_ht, @total_tva, @total_ttc, @notes)
`);
const updateFactureStmt = db.prepare(`
  UPDATE factures
  SET client_id = @client_id, chantier_id = @chantier_id, date_echeance = @date_echeance,
      taux_tva = @taux_tva, total_ht = @total_ht, total_tva = @total_tva, total_ttc = @total_ttc,
      notes = @notes
  WHERE id = @id
`);
const updateStatutStmt = db.prepare('UPDATE factures SET statut = ? WHERE id = ?');
const removeStmt = db.prepare('DELETE FROM factures WHERE id = ?');

const STATUTS = ['brouillon', 'envoyee', 'payee'];
const STATUT_LABELS = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
};

function saveLignes(factureId, lignes) {
  deleteLignesStmt.run(factureId);
  for (const ligne of lignes) {
    insertLigneStmt.run({ facture_id: factureId, ...ligne });
  }
}

const createTx = db.transaction((data) => {
  const tauxTva = parseFloat(data.taux_tva) || 0;
  const { lignes, totalHt, totalTva, totalTtc } = computeLignesEtTotaux(data.lignes || [], tauxTva);

  const info = insertFactureStmt.run({
    client_id: parseInt(data.client_id, 10),
    chantier_id: data.chantier_id ? parseInt(data.chantier_id, 10) : null,
    devis_id: data.devis_id ? parseInt(data.devis_id, 10) : null,
    statut: 'brouillon',
    date_echeance: data.date_echeance || null,
    taux_tva: tauxTva,
    total_ht: totalHt,
    total_tva: totalTva,
    total_ttc: totalTtc,
    notes: data.notes ? data.notes.trim() : null,
  });

  saveLignes(info.lastInsertRowid, lignes);
  return info.lastInsertRowid;
});

const updateTx = db.transaction((id, data) => {
  const tauxTva = parseFloat(data.taux_tva) || 0;
  const { lignes, totalHt, totalTva, totalTtc } = computeLignesEtTotaux(data.lignes || [], tauxTva);

  updateFactureStmt.run({
    id,
    client_id: parseInt(data.client_id, 10),
    chantier_id: data.chantier_id ? parseInt(data.chantier_id, 10) : null,
    date_echeance: data.date_echeance || null,
    taux_tva: tauxTva,
    total_ht: totalHt,
    total_tva: totalTva,
    total_ttc: totalTtc,
    notes: data.notes ? data.notes.trim() : null,
  });

  saveLignes(id, lignes);
});

const createFromDevisTx = db.transaction((devisId) => {
  const devis = devisDb.getById(devisId);
  if (!devis) throw new Error('Devis introuvable');
  const lignesDevis = devisDb.getLignes(devisId);

  const info = insertFactureStmt.run({
    client_id: devis.client_id,
    chantier_id: devis.chantier_id,
    devis_id: devis.id,
    statut: 'brouillon',
    date_echeance: null,
    taux_tva: devis.taux_tva,
    total_ht: devis.total_ht,
    total_tva: devis.total_tva,
    total_ttc: devis.total_ttc,
    notes: devis.notes,
  });

  for (const ligne of lignesDevis) {
    insertLigneStmt.run({
      facture_id: info.lastInsertRowid,
      description: ligne.description,
      quantite: ligne.quantite,
      unite: ligne.unite,
      prix_unitaire: ligne.prix_unitaire,
      total: ligne.total,
    });
  }

  return info.lastInsertRowid;
});

module.exports = {
  STATUTS,
  STATUT_LABELS,
  list() {
    return listStmt.all();
  },
  getById(id) {
    return getByIdStmt.get(id);
  },
  getLignes(factureId) {
    return getLignesStmt.all(factureId);
  },
  listByClient(clientId) {
    return listByClientStmt.all(clientId);
  },
  listByChantier(chantierId) {
    return listByChantierStmt.all(chantierId);
  },
  countUnpaid() {
    return countUnpaidStmt.get().n;
  },
  countOverdue() {
    return countOverdueStmt.get().n;
  },
  findByDevisId(devisId) {
    return findByDevisIdStmt.get(devisId);
  },
  create(data) {
    return createTx(data);
  },
  createFromDevis(devisId) {
    return createFromDevisTx(devisId);
  },
  update(id, data) {
    updateTx(id, data);
  },
  updateStatut(id, statut) {
    if (!STATUTS.includes(statut)) throw new Error('Statut invalide');
    updateStatutStmt.run(statut, id);
  },
  remove(id) {
    removeStmt.run(id);
  },
  isOverdue(facture) {
    return (
      facture.statut !== 'payee' &&
      facture.date_echeance &&
      facture.date_echeance < new Date().toISOString().slice(0, 10)
    );
  },
};

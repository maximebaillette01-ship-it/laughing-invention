const db = require('./index');
const { computeLignesEtTotaux } = require('./utils');

const baseSelect = `
  SELECT devis.*, clients.nom AS client_nom, chantiers.titre AS chantier_titre
  FROM devis
  JOIN clients ON clients.id = devis.client_id
  LEFT JOIN chantiers ON chantiers.id = devis.chantier_id
`;

const listStmt = db.prepare(`${baseSelect} ORDER BY devis.date_creation DESC`);
const getByIdStmt = db.prepare(`${baseSelect} WHERE devis.id = ?`);
const listByClientStmt = db.prepare(
  `${baseSelect} WHERE devis.client_id = ? ORDER BY devis.date_creation DESC`
);
const listByChantierStmt = db.prepare(
  `${baseSelect} WHERE devis.chantier_id = ? ORDER BY devis.date_creation DESC`
);
const countByStatutStmt = db.prepare('SELECT COUNT(*) AS n FROM devis WHERE statut = ?');

const getLignesStmt = db.prepare('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY id');
const insertLigneStmt = db.prepare(`
  INSERT INTO devis_lignes (devis_id, description, quantite, unite, prix_unitaire, total)
  VALUES (@devis_id, @description, @quantite, @unite, @prix_unitaire, @total)
`);
const deleteLignesStmt = db.prepare('DELETE FROM devis_lignes WHERE devis_id = ?');

const insertDevisStmt = db.prepare(`
  INSERT INTO devis
    (client_id, chantier_id, statut, date_validite, taux_tva, total_ht, total_tva, total_ttc, notes)
  VALUES
    (@client_id, @chantier_id, @statut, @date_validite, @taux_tva, @total_ht, @total_tva, @total_ttc, @notes)
`);
const updateDevisStmt = db.prepare(`
  UPDATE devis
  SET client_id = @client_id, chantier_id = @chantier_id, date_validite = @date_validite,
      taux_tva = @taux_tva, total_ht = @total_ht, total_tva = @total_tva, total_ttc = @total_ttc,
      notes = @notes
  WHERE id = @id
`);
const updateStatutStmt = db.prepare('UPDATE devis SET statut = ? WHERE id = ?');
const removeStmt = db.prepare('DELETE FROM devis WHERE id = ?');

const STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse'];
const STATUT_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
};

function saveLignes(devisId, lignes) {
  deleteLignesStmt.run(devisId);
  for (const ligne of lignes) {
    insertLigneStmt.run({ devis_id: devisId, ...ligne });
  }
}

const createTx = db.transaction((data) => {
  const tauxTva = parseFloat(data.taux_tva) || 0;
  const { lignes, totalHt, totalTva, totalTtc } = computeLignesEtTotaux(data.lignes || [], tauxTva);

  const info = insertDevisStmt.run({
    client_id: parseInt(data.client_id, 10),
    chantier_id: data.chantier_id ? parseInt(data.chantier_id, 10) : null,
    statut: 'brouillon',
    date_validite: data.date_validite || null,
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

  updateDevisStmt.run({
    id,
    client_id: parseInt(data.client_id, 10),
    chantier_id: data.chantier_id ? parseInt(data.chantier_id, 10) : null,
    date_validite: data.date_validite || null,
    taux_tva: tauxTva,
    total_ht: totalHt,
    total_tva: totalTva,
    total_ttc: totalTtc,
    notes: data.notes ? data.notes.trim() : null,
  });

  saveLignes(id, lignes);
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
  getLignes(devisId) {
    return getLignesStmt.all(devisId);
  },
  listByClient(clientId) {
    return listByClientStmt.all(clientId);
  },
  listByChantier(chantierId) {
    return listByChantierStmt.all(chantierId);
  },
  countByStatut(statut) {
    return countByStatutStmt.get(statut).n;
  },
  create(data) {
    return createTx(data);
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
};

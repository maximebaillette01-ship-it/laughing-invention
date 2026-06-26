const db = require('./index');

const baseSelect = `
  SELECT chantiers.*, clients.nom AS client_nom
  FROM chantiers
  JOIN clients ON clients.id = chantiers.client_id
`;

const listStmt = db.prepare(`${baseSelect} ORDER BY chantiers.created_at DESC`);
const getByIdStmt = db.prepare(`${baseSelect} WHERE chantiers.id = ?`);
const listByClientStmt = db.prepare(
  `${baseSelect} WHERE chantiers.client_id = ? ORDER BY chantiers.created_at DESC`
);
const countByStatutStmt = db.prepare('SELECT COUNT(*) AS n FROM chantiers WHERE statut = ?');
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM chantiers');
const insertStmt = db.prepare(`
  INSERT INTO chantiers
    (client_id, titre, description, adresse, statut, date_debut, date_fin_prevue, date_fin_reelle)
  VALUES
    (@client_id, @titre, @description, @adresse, @statut, @date_debut, @date_fin_prevue, @date_fin_reelle)
`);
const updateStmt = db.prepare(`
  UPDATE chantiers
  SET client_id = @client_id, titre = @titre, description = @description, adresse = @adresse,
      statut = @statut, date_debut = @date_debut, date_fin_prevue = @date_fin_prevue,
      date_fin_reelle = @date_fin_reelle
  WHERE id = @id
`);
const updateStatutStmt = db.prepare('UPDATE chantiers SET statut = ? WHERE id = ?');
const removeStmt = db.prepare('DELETE FROM chantiers WHERE id = ?');

const STATUTS = ['en_attente', 'en_cours', 'termine', 'annule'];
const STATUT_LABELS = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

function normalize(data) {
  return {
    client_id: parseInt(data.client_id, 10),
    titre: data.titre.trim(),
    description: data.description ? data.description.trim() : null,
    adresse: data.adresse ? data.adresse.trim() : null,
    statut: STATUTS.includes(data.statut) ? data.statut : 'en_attente',
    date_debut: data.date_debut || null,
    date_fin_prevue: data.date_fin_prevue || null,
    date_fin_reelle: data.date_fin_reelle || null,
  };
}

module.exports = {
  STATUTS,
  STATUT_LABELS,
  list() {
    return listStmt.all();
  },
  getById(id) {
    return getByIdStmt.get(id);
  },
  listByClient(clientId) {
    return listByClientStmt.all(clientId);
  },
  count() {
    return countStmt.get().n;
  },
  countByStatut(statut) {
    return countByStatutStmt.get(statut).n;
  },
  create(data) {
    const info = insertStmt.run(normalize(data));
    return info.lastInsertRowid;
  },
  update(id, data) {
    updateStmt.run({ ...normalize(data), id });
  },
  updateStatut(id, statut) {
    if (!STATUTS.includes(statut)) throw new Error('Statut invalide');
    updateStatutStmt.run(statut, id);
  },
  remove(id) {
    removeStmt.run(id);
  },
};

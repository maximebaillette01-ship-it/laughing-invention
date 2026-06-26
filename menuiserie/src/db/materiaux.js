const db = require('./index');

const listStmt = db.prepare('SELECT * FROM materiaux ORDER BY nom COLLATE NOCASE');
const getByIdStmt = db.prepare('SELECT * FROM materiaux WHERE id = ?');
const listLowStockStmt = db.prepare(
  'SELECT * FROM materiaux WHERE quantite <= seuil_alerte ORDER BY nom COLLATE NOCASE'
);
const countLowStockStmt = db.prepare(
  'SELECT COUNT(*) AS n FROM materiaux WHERE quantite <= seuil_alerte'
);
const insertStmt = db.prepare(`
  INSERT INTO materiaux (nom, unite, quantite, seuil_alerte, prix_unitaire, fournisseur)
  VALUES (@nom, @unite, @quantite, @seuil_alerte, @prix_unitaire, @fournisseur)
`);
const updateStmt = db.prepare(`
  UPDATE materiaux
  SET nom = @nom, unite = @unite, quantite = @quantite, seuil_alerte = @seuil_alerte,
      prix_unitaire = @prix_unitaire, fournisseur = @fournisseur, updated_at = datetime('now')
  WHERE id = @id
`);
const removeStmt = db.prepare('DELETE FROM materiaux WHERE id = ?');

function normalize(data) {
  return {
    nom: data.nom.trim(),
    unite: data.unite ? data.unite.trim() : 'unité',
    quantite: parseFloat(data.quantite) || 0,
    seuil_alerte: parseFloat(data.seuil_alerte) || 0,
    prix_unitaire: data.prix_unitaire !== undefined && data.prix_unitaire !== ''
      ? parseFloat(data.prix_unitaire)
      : null,
    fournisseur: data.fournisseur ? data.fournisseur.trim() : null,
  };
}

module.exports = {
  list() {
    return listStmt.all();
  },
  getById(id) {
    return getByIdStmt.get(id);
  },
  listLowStock() {
    return listLowStockStmt.all();
  },
  countLowStock() {
    return countLowStockStmt.get().n;
  },
  create(data) {
    const info = insertStmt.run(normalize(data));
    return info.lastInsertRowid;
  },
  update(id, data) {
    updateStmt.run({ ...normalize(data), id });
  },
  remove(id) {
    removeStmt.run(id);
  },
};

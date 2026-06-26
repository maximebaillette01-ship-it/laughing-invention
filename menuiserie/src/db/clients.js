const db = require('./index');

const listStmt = db.prepare('SELECT * FROM clients ORDER BY nom COLLATE NOCASE');
const getByIdStmt = db.prepare('SELECT * FROM clients WHERE id = ?');
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM clients');
const insertStmt = db.prepare(`
  INSERT INTO clients (nom, entreprise, email, telephone, adresse, notes)
  VALUES (@nom, @entreprise, @email, @telephone, @adresse, @notes)
`);
const updateStmt = db.prepare(`
  UPDATE clients
  SET nom = @nom, entreprise = @entreprise, email = @email,
      telephone = @telephone, adresse = @adresse, notes = @notes
  WHERE id = @id
`);
const removeStmt = db.prepare('DELETE FROM clients WHERE id = ?');

function normalize(data) {
  return {
    nom: data.nom.trim(),
    entreprise: data.entreprise ? data.entreprise.trim() : null,
    email: data.email ? data.email.trim() : null,
    telephone: data.telephone ? data.telephone.trim() : null,
    adresse: data.adresse ? data.adresse.trim() : null,
    notes: data.notes ? data.notes.trim() : null,
  };
}

module.exports = {
  list() {
    return listStmt.all();
  },
  getById(id) {
    return getByIdStmt.get(id);
  },
  count() {
    return countStmt.get().n;
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

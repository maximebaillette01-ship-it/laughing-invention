function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Normalise une liste de lignes brutes (description, quantite, unite, prix_unitaire)
// et calcule les totaux HT / TVA / TTC associés.
function computeLignesEtTotaux(lignesBrutes, tauxTva) {
  const lignes = lignesBrutes
    .map((l) => ({
      description: String(l.description || '').trim(),
      quantite: parseFloat(l.quantite),
      unite: l.unite ? String(l.unite).trim() : null,
      prix_unitaire: parseFloat(l.prix_unitaire),
    }))
    .filter((l) => l.description && Number.isFinite(l.quantite) && Number.isFinite(l.prix_unitaire))
    .map((l) => ({ ...l, total: round2(l.quantite * l.prix_unitaire) }));

  const totalHt = round2(lignes.reduce((sum, l) => sum + l.total, 0));
  const totalTva = round2(totalHt * (tauxTva / 100));
  const totalTtc = round2(totalHt + totalTva);

  return { lignes, totalHt, totalTva, totalTtc };
}

module.exports = { round2, computeLignesEtTotaux };

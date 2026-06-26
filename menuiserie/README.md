# Menuiserie App

Application web sur mesure pour gérer une entreprise de menuiserie de A à Z :
clients, stock de matériaux, chantiers, devis et factures. Construite avec
Node.js, Express, EJS et SQLite (`better-sqlite3`), avec la même base de
sécurité que le projet SecureSite du dépôt (authentification, CSRF, en-têtes
durcis).

## Installation

```bash
npm install
cp .env.example .env
# éditer .env : SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm run seed   # crée le compte administrateur
npm start      # ou: npm run dev (rechargement auto)
```

L'application est servie sur `http://localhost:3001` (port configurable via
`PORT`). La connexion se fait sur `/login`.

## Fonctionnalités

- **Clients** : carnet d'adresses (coordonnées, notes), fiche détaillée avec
  l'historique des chantiers, devis et factures liés.
- **Matériaux / stock** : suivi des quantités, seuil d'alerte, alerte visible
  sur le tableau de bord et liste dédiée quand le stock est bas.
- **Chantiers** : suivi de l'avancement par statut (en attente, en cours,
  terminé, annulé), rattachés à un client.
- **Devis** : lignes dynamiques (description/quantité/unité/prix), calcul
  serveur du total HT/TVA/TTC, cycle de statut (brouillon → envoyé → accepté/
  refusé), conversion en facture en un clic une fois accepté, vue imprimable.
- **Factures** : générées librement ou depuis un devis accepté, statut
  payée/impayée, détection des factures en retard (échéance dépassée),
  vue imprimable.
- **Tableau de bord** : compteurs clés (clients, chantiers en cours/en
  attente, devis en attente, factures impayées/en retard, matériaux sous
  seuil) et listes des éléments récents/à traiter.

## Sécurité

Reprend les mesures du projet SecureSite :

- En-têtes HTTP durcis (`helmet`), CSP stricte sans script/style inline.
- Protection CSRF par jeton de synchronisation sur tous les formulaires.
- Mots de passe hachés avec `bcryptjs`, verrouillage de compte après 5
  échecs, comparaison à hash factice pour limiter l'énumération de comptes.
- Sessions stockées côté serveur (SQLite), régénérées à la connexion.
- Limitation de débit globale et dédiée au login.
- Requêtes SQL préparées (`better-sqlite3`), aucune concaténation de
  chaînes ; validation des entrées (`express-validator`).

## Tests

```bash
npm test
```

Couvre l'authentification (succès/échec, protection des routes), le rejet
des mutations sans jeton CSRF, le cycle complet du module clients (création,
fiche, édition, suppression), le parcours devis → facture (calcul des
totaux, conversion) et l'alerte de stock bas sur le tableau de bord.

## Structure

```
server.js                point d'entrée
src/app.js                configuration Express (middlewares, routes)
src/config/env.js          chargement des variables d'environnement
src/db/                    accès SQLite (schéma + requêtes préparées par module)
src/middleware/            sécurité, sessions, CSRF, rate limiting, auth
src/routes/                clients, matériaux, chantiers, devis, factures, auth, dashboard
views/                     templates EJS (partagés via views/partials/)
public/                    CSS et JS statiques (lignes dynamiques des devis/factures)
scripts/seed-admin.js       création du compte administrateur initial
test/app.test.js           tests d'intégration (supertest)
```

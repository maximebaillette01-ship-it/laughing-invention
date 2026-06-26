# SecureSite

Site vitrine sécurisé construit avec Node.js, Express et EJS, avec un
formulaire de contact public et un espace administrateur protégé pour
consulter les messages reçus.

## Installation

```bash
npm install
cp .env.example .env
# éditer .env : SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm run seed   # crée le compte administrateur
npm start      # ou: npm run dev (rechargement auto)
```

Le site est servi sur `http://localhost:3000` (port configurable via `PORT`).
L'espace admin est accessible sur `/admin/login`.

## Mesures de sécurité mises en œuvre

- **En-têtes HTTP durcis** (`helmet`) : Content-Security-Policy stricte
  (`default-src 'self'`, pas de scripts/styles inline, `frame-ancestors
  'none'`, `object-src 'none'`), HSTS, `X-Content-Type-Options`, et
  désactivation de `X-Powered-By`.
- **Protection CSRF** : jeton de synchronisation (`src/middleware/csrf.js`)
  généré par session et vérifié avec une comparaison à temps constant
  (`crypto.timingSafeEqual`) sur chaque formulaire (contact, login, logout).
- **Protection XSS** : EJS échappe automatiquement toute variable affichée
  avec `<%= %>` ; aucune donnée utilisateur n'est insérée via `<%- %>` ou
  concaténée dans le HTML. Aucun script inline (compatible avec la CSP).
- **Protection contre l'injection SQL** : toutes les requêtes
  (`src/db/users.js`, `src/db/messages.js`) utilisent des requêtes préparées
  avec paramètres liés (`better-sqlite3`), sans concaténation de chaînes.
- **Authentification robuste** :
  - Mots de passe hachés avec `bcryptjs` (coût 12).
  - Sessions stockées côté serveur (SQLite), cookies `httpOnly`, `sameSite:
    strict`, `secure` en production.
  - Régénération de session à la connexion (anti session-fixation).
  - Verrouillage de compte après 5 échecs (15 minutes), et comparaison
    factice (hash bidon) quand l'utilisateur n'existe pas, pour limiter
    l'énumération de comptes et les attaques temporelles.
- **Limitation de débit** (`express-rate-limit`) : limite globale par IP,
  plus des limites strictes dédiées sur `/contact` (anti-spam) et
  `/admin/login` (anti brute-force).
- **Validation des entrées** (`express-validator`) sur le formulaire de
  contact et le login (longueur, format e-mail, champs requis).
- **Bonnes pratiques générales** : taille de payload limitée (10 kb),
  gestion d'erreurs sans fuite de stack trace en production, secrets
  uniquement via variables d'environnement (`.env`, jamais committé).

## Tests

```bash
npm test
```

Vérifie la présence des en-têtes de sécurité, le rejet des requêtes sans
jeton CSRF, la limitation de débit et la protection des routes admin.

## Structure

```
server.js              point d'entrée
src/app.js              configuration Express (middlewares, routes)
src/config/env.js        chargement des variables d'environnement
src/db/                  accès SQLite (requêtes préparées)
src/middleware/          sécurité, sessions, CSRF, rate limiting, auth
src/routes/              routes publiques, login/logout, dashboard admin
views/                   templates EJS
public/                  CSS statique
scripts/seed-admin.js     création du compte administrateur
```

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { databasePath } = require('../config/env');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    entreprise TEXT,
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS materiaux (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    unite TEXT NOT NULL DEFAULT 'unité',
    quantite REAL NOT NULL DEFAULT 0,
    seuil_alerte REAL NOT NULL DEFAULT 0,
    prix_unitaire REAL,
    fournisseur TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chantiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    description TEXT,
    adresse TEXT,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    date_debut TEXT,
    date_fin_prevue TEXT,
    date_fin_reelle TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    chantier_id INTEGER REFERENCES chantiers(id) ON DELETE SET NULL,
    statut TEXT NOT NULL DEFAULT 'brouillon',
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    date_validite TEXT,
    taux_tva REAL NOT NULL DEFAULT 20,
    total_ht REAL NOT NULL DEFAULT 0,
    total_tva REAL NOT NULL DEFAULT 0,
    total_ttc REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devis_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    devis_id INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite REAL NOT NULL,
    unite TEXT,
    prix_unitaire REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS factures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    chantier_id INTEGER REFERENCES chantiers(id) ON DELETE SET NULL,
    devis_id INTEGER REFERENCES devis(id) ON DELETE SET NULL,
    statut TEXT NOT NULL DEFAULT 'brouillon',
    date_emission TEXT NOT NULL DEFAULT (datetime('now')),
    date_echeance TEXT,
    taux_tva REAL NOT NULL DEFAULT 20,
    total_ht REAL NOT NULL DEFAULT 0,
    total_tva REAL NOT NULL DEFAULT 0,
    total_ttc REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facture_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facture_id INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantite REAL NOT NULL,
    unite TEXT,
    prix_unitaire REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_chantiers_client ON chantiers(client_id);
  CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);
  CREATE INDEX IF NOT EXISTS idx_devis_chantier ON devis(chantier_id);
  CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id);
  CREATE INDEX IF NOT EXISTS idx_factures_chantier ON factures(chantier_id);
  CREATE INDEX IF NOT EXISTS idx_devis_lignes_devis ON devis_lignes(devis_id);
  CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON facture_lignes(facture_id);
`);

// La table "sessions" (sid, sess, expire) est créée et gérée par
// better-sqlite3-session-store, voir src/middleware/session.js.

module.exports = db;

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const testDbPath = path.join(os.tmpdir(), `menuiserie-test-${process.pid}-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = testDbPath;
process.env.SESSION_SECRET = 'test-only-secret-not-for-production-use';

const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const { createUser } = require('../src/db/users');

function getCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, 'le jeton CSRF doit être présent dans la page');
  return match[1];
}

test.before(async () => {
  createUser('testadmin', await bcrypt.hash('CorrectPassw0rd!', 10));
});

test.after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(testDbPath + suffix, { force: true });
  }
});

async function login(agent) {
  const page = await agent.get('/login');
  const res = await agent.post('/login').type('form').send({
    _csrf: getCsrfToken(page.text),
    username: 'testadmin',
    password: 'CorrectPassw0rd!',
  });
  assert.equal(res.status, 302);
}

test('les pages protégées requièrent une authentification', async () => {
  const res = await request(app).get('/clients');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /\/login/);
});

test('la connexion rejette de mauvais identifiants puis accepte les bons', async () => {
  const agent = request.agent(app);

  const badPage = await agent.get('/login');
  const badRes = await agent.post('/login').type('form').send({
    _csrf: getCsrfToken(badPage.text),
    username: 'testadmin',
    password: 'wrong',
  });
  assert.equal(badRes.status, 401);

  await login(agent);

  const dashboard = await agent.get('/dashboard');
  assert.equal(dashboard.status, 200);
});

test('les routes de mutation sont rejetées sans jeton CSRF', async () => {
  const agent = request.agent(app);
  await login(agent);

  const res = await agent.post('/clients').type('form').send({ nom: 'Sans CSRF' });
  assert.equal(res.status, 403);
});

test('le module clients couvre le cycle complet : création, fiche, édition, suppression', async () => {
  const agent = request.agent(app);
  await login(agent);

  // Page de création (régression : un local nommé "client" entrait en
  // collision avec l'option EJS réservée du même nom et cassait include()).
  const newPage = await agent.get('/clients/new');
  assert.equal(newPage.status, 200);

  const createRes = await agent.post('/clients').type('form').send({
    _csrf: getCsrfToken(newPage.text),
    nom: 'Jean Dupont',
    entreprise: 'Dupont SARL',
    email: 'jean@example.com',
    telephone: '0102030405',
    adresse: '1 rue des Tests',
    notes: '',
  });
  assert.equal(createRes.status, 302);
  const clientId = createRes.headers.location.match(/\/clients\/(\d+)/)[1];

  const showPage = await agent.get(`/clients/${clientId}`);
  assert.equal(showPage.status, 200);
  assert.match(showPage.text, /Jean Dupont/);

  const editPage = await agent.get(`/clients/${clientId}/edit`);
  assert.equal(editPage.status, 200);

  const updateRes = await agent.post(`/clients/${clientId}`).type('form').send({
    _csrf: getCsrfToken(editPage.text),
    nom: 'Jean Dupont Modifié',
    entreprise: 'Dupont SARL',
    email: 'jean@example.com',
    telephone: '0102030405',
    adresse: '1 rue des Tests',
    notes: '',
  });
  assert.equal(updateRes.status, 302);

  const updatedShowPage = await agent.get(`/clients/${clientId}`);
  assert.match(updatedShowPage.text, /Jean Dupont Modifié/);

  const deletePage = await agent.get(`/clients/${clientId}`);
  const deleteRes = await agent.post(`/clients/${clientId}/delete`).type('form').send({
    _csrf: getCsrfToken(deletePage.text),
  });
  assert.equal(deleteRes.status, 302);

  const afterDelete = await agent.get(`/clients/${clientId}`);
  assert.equal(afterDelete.status, 404);
});

test('le parcours devis -> facture calcule les totaux et permet la conversion', async () => {
  const agent = request.agent(app);
  await login(agent);

  const newClientPage = await agent.get('/clients/new');
  const clientRes = await agent.post('/clients').type('form').send({
    _csrf: getCsrfToken(newClientPage.text),
    nom: 'Client Devis',
  });
  const clientId = clientRes.headers.location.match(/\/clients\/(\d+)/)[1];

  const newDevisPage = await agent.get(`/devis/new?client_id=${clientId}`);
  assert.equal(newDevisPage.status, 200);

  const devisRes = await agent.post('/devis').type('form').send({
    _csrf: getCsrfToken(newDevisPage.text),
    client_id: clientId,
    chantier_id: '',
    statut: 'brouillon',
    date_creation: '2026-01-01',
    date_validite: '',
    taux_tva: '20',
    notes: '',
    description: ['Pose fenêtre', 'Volet roulant'],
    quantite: ['3', '1'],
    unite: ['u', 'u'],
    prix_unitaire: ['120', '300'],
  });
  assert.equal(devisRes.status, 302);
  const devisId = devisRes.headers.location.match(/\/devis\/(\d+)/)[1];

  const devisShow = await agent.get(`/devis/${devisId}`);
  assert.equal(devisShow.status, 200);
  assert.match(devisShow.text, /660[.,]00/);
  assert.match(devisShow.text, /792[.,]00/);

  const acceptRes = await agent.post(`/devis/${devisId}/statut`).type('form').send({
    _csrf: getCsrfToken(devisShow.text),
    statut: 'accepte',
  });
  assert.equal(acceptRes.status, 302);

  const acceptedShow = await agent.get(`/devis/${devisId}`);
  const convertRes = await agent.post(`/devis/${devisId}/convertir`).type('form').send({
    _csrf: getCsrfToken(acceptedShow.text),
  });
  assert.equal(convertRes.status, 302);
  assert.match(convertRes.headers.location, /\/factures\/\d+/);

  const factureShow = await agent.get(convertRes.headers.location);
  assert.equal(factureShow.status, 200);
  assert.match(factureShow.text, /792[.,]00/);
});

test('le module matériaux signale le stock bas sur le tableau de bord', async () => {
  const agent = request.agent(app);
  await login(agent);

  const newMatPage = await agent.get('/materiaux/new');
  const matRes = await agent.post('/materiaux').type('form').send({
    _csrf: getCsrfToken(newMatPage.text),
    nom: 'Vis inox',
    unite: 'boîte',
    quantite: '2',
    seuil_alerte: '10',
    prix_unitaire: '5',
    fournisseur: '',
  });
  assert.equal(matRes.status, 302);

  const dashboard = await agent.get('/dashboard');
  assert.equal(dashboard.status, 200);
  assert.match(dashboard.text, /Vis inox/);
});

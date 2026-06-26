const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const testDbPath = path.join(os.tmpdir(), `securesite-test-${process.pid}-${Date.now()}.sqlite`);
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

test('la page d\'accueil renvoie des en-têtes de sécurité durcis', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-security-policy'], /default-src 'self'/);
  assert.ok(res.headers['strict-transport-security']);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('le formulaire de contact est rejeté sans jeton CSRF', async () => {
  const res = await request(app)
    .post('/contact')
    .type('form')
    .send({ name: 'Test', email: 'test@example.com', message: 'Bonjour' });
  assert.equal(res.status, 403);
});

test('le formulaire de contact valide une entrée invalide', async () => {
  const agent = request.agent(app);
  const page = await agent.get('/contact');
  const csrfToken = getCsrfToken(page.text);

  const res = await agent
    .post('/contact')
    .type('form')
    .send({ _csrf: csrfToken, name: 'Test', email: 'pas-un-email', message: 'Bonjour' });
  assert.equal(res.status, 400);
});

test('le formulaire de contact accepte une soumission valide et échappe le contenu stocké', async () => {
  const agent = request.agent(app);
  const page = await agent.get('/contact');
  const csrfToken = getCsrfToken(page.text);

  const res = await agent.post('/contact').type('form').send({
    _csrf: csrfToken,
    name: 'Test User',
    email: 'test@example.com',
    message: '<script>alert(1)</script>',
  });
  assert.equal(res.status, 200);
});

test('le tableau de bord admin requiert une authentification', async () => {
  const res = await request(app).get('/admin/dashboard');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /\/admin\/login/);
});

test('la connexion admin rejette des identifiants invalides puis accepte les bons', async () => {
  const agent = request.agent(app);

  const badPage = await agent.get('/admin/login');
  const badRes = await agent
    .post('/admin/login')
    .type('form')
    .send({ _csrf: getCsrfToken(badPage.text), username: 'testadmin', password: 'wrong' });
  assert.equal(badRes.status, 401);

  const goodPage = await agent.get('/admin/login');
  const goodRes = await agent.post('/admin/login').type('form').send({
    _csrf: getCsrfToken(goodPage.text),
    username: 'testadmin',
    password: 'CorrectPassw0rd!',
  });
  assert.equal(goodRes.status, 302);

  const dashboard = await agent.get('/admin/dashboard');
  assert.equal(dashboard.status, 200);
  assert.match(dashboard.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('une tentative d\'injection SQL dans le login échoue proprement (pas de bypass, pas d\'erreur serveur)', async () => {
  const agent = request.agent(app);
  const page = await agent.get('/admin/login');
  const res = await agent.post('/admin/login').type('form').send({
    _csrf: getCsrfToken(page.text),
    username: "' OR '1'='1",
    password: "' OR '1'='1",
  });
  assert.equal(res.status, 401);
});

test('la connexion admin est limitée en débit après plusieurs tentatives', async () => {
  const agent = request.agent(app);
  let lastStatus;
  for (let i = 0; i < 11; i += 1) {
    const page = await agent.get('/admin/login');
    const res = await agent.post('/admin/login').type('form').send({
      _csrf: getCsrfToken(page.text),
      username: 'nobody',
      password: 'nobody',
    });
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);
});

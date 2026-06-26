const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { isProduction, trustProxy } = require('./config/env');
const security = require('./middleware/security');
const sessionMiddleware = require('./middleware/session');
const { csrfToken } = require('./middleware/csrf');
const { globalLimiter } = require('./middleware/rateLimit');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const clientsRoutes = require('./routes/clients');
const materiauxRoutes = require('./routes/materiaux');
const chantiersRoutes = require('./routes/chantiers');
const devisRoutes = require('./routes/devis');
const facturesRoutes = require('./routes/factures');

const app = express();

if (trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(security);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

app.use(sessionMiddleware);
app.use(globalLimiter);
app.use(csrfToken);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.username = req.session.username || null;
  next();
});

app.use('/', authRoutes);
app.use('/', requireAuth, dashboardRoutes);
app.use('/clients', requireAuth, clientsRoutes);
app.use('/materiaux', requireAuth, materiauxRoutes);
app.use('/chantiers', requireAuth, chantiersRoutes);
app.use('/devis', requireAuth, devisRoutes);
app.use('/factures', requireAuth, facturesRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Page non trouvée' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Erreur serveur',
    message: isProduction ? 'Une erreur est survenue.' : err.message,
  });
});

module.exports = app;

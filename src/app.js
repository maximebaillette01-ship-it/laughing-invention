const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { isProduction, trustProxy } = require('./config/env');
const security = require('./middleware/security');
const sessionMiddleware = require('./middleware/session');
const { csrfToken } = require('./middleware/csrf');
const { globalLimiter } = require('./middleware/rateLimit');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

if (trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(security);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

app.use(sessionMiddleware);
app.use(globalLimiter);
app.use(csrfToken);

app.use('/', publicRoutes);
app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);

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

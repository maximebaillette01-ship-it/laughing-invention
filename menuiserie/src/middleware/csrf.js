const crypto = require('crypto');

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

// Expose le jeton courant à toutes les vues (champ caché des formulaires).
function csrfToken(req, res, next) {
  res.locals.csrfToken = ensureToken(req);
  next();
}

// Pattern "synchronizer token" : compare le jeton du formulaire à celui en
// session avec une comparaison à temps constant pour éviter les attaques temporelles.
function csrfProtection(req, res, next) {
  const fromRequest = req.body && req.body._csrf;
  const fromSession = req.session && req.session.csrfToken;

  const valid =
    typeof fromRequest === 'string' &&
    typeof fromSession === 'string' &&
    fromRequest.length === fromSession.length &&
    crypto.timingSafeEqual(Buffer.from(fromRequest), Buffer.from(fromSession));

  if (!valid) {
    return res.status(403).render('error', {
      title: 'Requête invalide',
      message: 'Jeton de sécurité invalide ou expiré. Veuillez recharger la page et réessayer.',
    });
  }

  next();
}

module.exports = { csrfToken, csrfProtection };

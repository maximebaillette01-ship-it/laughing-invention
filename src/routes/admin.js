const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { listMessages } = require('../db/messages');

const router = express.Router();

router.get('/dashboard', requireAdmin, (req, res) => {
  res.render('dashboard', {
    title: 'Tableau de bord',
    messages: listMessages(),
    adminUsername: req.session.adminUsername,
  });
});

module.exports = router;

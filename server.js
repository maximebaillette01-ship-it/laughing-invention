const app = require('./src/app');
const { port } = require('./src/config/env');

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

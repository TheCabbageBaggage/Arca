require('dotenv').config();

const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Arca backend listening on port ${env.port}`);
});

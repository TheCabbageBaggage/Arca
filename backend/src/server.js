require('dotenv').config();

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initializeSocketServer } = require('./realtime/socket');

const server = http.createServer(app);
initializeSocketServer(server, { corsOrigin: env.corsOrigin });

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Arca backend listening on port ${env.port} (HTTP + WebSocket)`);
});

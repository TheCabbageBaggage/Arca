const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const healthRoutes = require('./api/health.routes');
const apiRoutes = require('./api');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', healthRoutes);
app.use('/api/v1', apiRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Arca API',
    version: '0.1.0',
    docs: 'See documentation.md for full API scope.'
  });
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || error.status || 500;
  res.status(status).json({
    error: error.message || 'Internal server error'
  });
});

module.exports = app;

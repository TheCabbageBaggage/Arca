const path = require('path');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'sqlite', 'arca.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

module.exports = env;

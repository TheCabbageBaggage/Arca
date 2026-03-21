const path = require('path');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'sqlite', 'arca.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  agentKeySecret: process.env.AGENT_KEY_SECRET || 'dev-agent-key-secret-change-me',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@arca.local',
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME || 'Arca Admin',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin1234'
};

module.exports = env;

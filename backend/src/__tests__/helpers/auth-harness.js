const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function purgeBackendModules() {
  const marker = `${path.sep}backend${path.sep}src${path.sep}`;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(marker)) {
      delete require.cache[cacheKey];
    }
  }
}

async function createAuthHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arca-m2-test-'));
  const dbPath = path.join(tmpDir, 'test.db');

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.AGENT_KEY_SECRET = 'test-agent-secret';
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com';
  process.env.BOOTSTRAP_ADMIN_NAME = 'Admin User';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'correct-horse-battery-staple';

  purgeBackendModules();

  const { migrate } = require('../../db/migrator');
  const { openDatabase, closeDatabase } = require('../../db/client');
  const { hashSecret } = require('../../modules/auth/crypto-utils');
  const AuthService = require('../../modules/auth/auth.service');
  const authMiddleware = require('../../middleware/auth');

  migrate();

  const db = openDatabase();
  db.prepare(
    `INSERT INTO users (user_uuid, username, email, password_hash, role, scopes, display_name, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    crypto.randomUUID(),
    'user@example.com',
    'user@example.com',
    hashSecret('letmein'),
    'user',
    JSON.stringify(['auth:read']),
    'Normal User'
  );

  const authService = new AuthService();

  return {
    authService,
    authMiddleware,
    async runMiddleware(middleware, req) {
      return new Promise((resolve) => {
        middleware(req, {}, (error) => {
          resolve(error || null);
        });
      });
    },
    async close() {
      closeDatabase();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}

module.exports = {
  createAuthHarness
};

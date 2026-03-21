const fs = require('fs');
const os = require('os');
const path = require('path');

function purgeBackendModules() {
  const marker = `${path.sep}backend${path.sep}src${path.sep}`;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(marker)) {
      delete require.cache[cacheKey];
    }
  }
}

async function createM4Harness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arca-m4-test-'));
  const dbPath = path.join(tmpDir, 'm4.db');

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  delete process.env.NEXTCLOUD_URL;
  delete process.env.NEXTCLOUD_USER;
  delete process.env.NEXTCLOUD_PASSWORD;
  process.env.NEXTCLOUD_BASE_PATH = '/ERP-Documents';

  purgeBackendModules();

  const { migrate } = require('../../db/migrator');
  const { openDatabase, closeDatabase } = require('../../db/client');
  const { documentsService } = require('../../modules/documents');
  const documentsRoutes = require('../../api/documents.routes');
  const contactsRoutes = require('../../api/contacts.routes');

  migrate();

  const db = openDatabase();

  db.prepare('INSERT INTO contacts (contact_no, type, name) VALUES (?, ?, ?)').run(
    'C-10001',
    'debtor',
    'Acme Corp'
  );

  function createResponse() {
    return {
      statusCode: 200,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      send(payload) {
        this.body = payload;
        return this;
      }
    };
  }

  async function invoke(handler, req = {}) {
    const res = createResponse();
    let nextError = null;

    try {
      await handler(req, res, (error) => {
        nextError = error || null;
      });
    } catch (error) {
      nextError = error;
    }

    return {
      error: nextError,
      res
    };
  }

  async function close() {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return {
    db,
    documentsService,
    documentsRoutes,
    contactsRoutes,
    invoke,
    close
  };
}

module.exports = {
  createM4Harness
};

const { openDatabase } = require('../../db/client');

function ensureDocumentsSchema() {
  const db = openDatabase();
  const requiredTables = ['documents'];
  const missing = requiredTables.filter((name) => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(name);
    return !row;
  });

  if (missing.length > 0) {
    const error = new Error(
      `Missing M4 tables: ${missing.join(', ')}. Run 'npm run db:migrate' before using documents modules.`
    );
    error.statusCode = 500;
    throw error;
  }

  return db;
}

module.exports = {
  ensureDocumentsSchema
};

const { openDatabase } = require('../../db/client');

function hasTable(db, name) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(name);
  return Boolean(row);
}

function ensureFinanceSchema() {
  const db = openDatabase();
  const requiredTables = [
    'contacts',
    'transaction_log',
    'system_log',
    'invoices',
    'payments',
    'journal_entries',
    'accounting_periods',
    'spend_approval_rules'
  ];
  const missing = requiredTables.filter((name) => !hasTable(db, name));

  if (missing.length > 0) {
    const error = new Error(`Missing finance tables: ${missing.join(', ')}. Run 'npm run db:migrate' first.`);
    error.statusCode = 500;
    throw error;
  }

  return db;
}

module.exports = {
  ensureFinanceSchema,
  hasTable
};

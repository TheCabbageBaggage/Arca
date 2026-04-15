const { openDatabase } = require('../client');

/**
 * Migration 018: Add VAT validation fields to contacts and invoices (idempotent version)
 */
function migrate(db) {
  console.log('Running migration 018 (idempotent): VAT validation fields...');

  // Helper function to check if column exists
  function columnExists(table, column) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    return columns.some(col => col.name === column);
  }

  // Add VAT fields to contacts table (if they don't exist)
  if (!columnExists('contacts', 'vat_number')) {
    db.exec('ALTER TABLE contacts ADD COLUMN vat_number TEXT;');
  }
  if (!columnExists('contacts', 'vat_country')) {
    db.exec('ALTER TABLE contacts ADD COLUMN vat_country TEXT;');
  }
  if (!columnExists('contacts', 'vat_validated_at')) {
    db.exec('ALTER TABLE contacts ADD COLUMN vat_validated_at DATETIME;');
  }
  if (!columnExists('contacts', 'vat_valid')) {
    db.exec('ALTER TABLE contacts ADD COLUMN vat_valid INTEGER DEFAULT 0 CHECK (vat_valid IN (0, 1));');
  }
  if (!columnExists('contacts', 'vat_name')) {
    db.exec('ALTER TABLE contacts ADD COLUMN vat_name TEXT;');
  }

  // Add reverse charge and VAT rate fields to invoices table (if they don't exist)
  if (!columnExists('invoices', 'reverse_charge')) {
    db.exec('ALTER TABLE invoices ADD COLUMN reverse_charge INTEGER DEFAULT 0 CHECK (reverse_charge IN (0, 1));');
  }
  if (!columnExists('invoices', 'vat_rate')) {
    db.exec('ALTER TABLE invoices ADD COLUMN vat_rate REAL DEFAULT 20 CHECK (vat_rate >= 0);');
  }

  // Create index for VAT validation lookups (if they don't exist)
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_vat_country ON contacts(vat_country);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_vat_valid ON contacts(vat_valid);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_reverse_charge ON invoices(reverse_charge);');
  } catch (e) {
    console.log('Index creation skipped (may already exist):', e.message);
  }

  console.log('Migration 018 (idempotent) completed successfully');
}

if (require.main === module) {
  const db = openDatabase();
  migrate(db);
  db.close();
}

module.exports = migrate;

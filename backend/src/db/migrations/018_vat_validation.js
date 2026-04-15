const { openDatabase } = require('../client');

/**
 * Migration 018: Add VAT validation fields to contacts and invoices
 */
function migrate(db) {
  console.log('Running migration 018: VAT validation fields...');

  // Add VAT fields to contacts table
  db.exec(`
    ALTER TABLE contacts ADD COLUMN vat_number TEXT;
    ALTER TABLE contacts ADD COLUMN vat_country TEXT;
    ALTER TABLE contacts ADD COLUMN vat_validated_at DATETIME;
    ALTER TABLE contacts ADD COLUMN vat_valid INTEGER DEFAULT 0 CHECK (vat_valid IN (0, 1));
    ALTER TABLE contacts ADD COLUMN vat_name TEXT;
  `);

  // Add reverse charge and VAT rate fields to invoices table
  db.exec(`
    ALTER TABLE invoices ADD COLUMN reverse_charge INTEGER DEFAULT 0 CHECK (reverse_charge IN (0, 1));
    ALTER TABLE invoices ADD COLUMN vat_rate REAL DEFAULT 20 CHECK (vat_rate >= 0);
  `);

  // Create index for VAT validation lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contacts_vat_country ON contacts(vat_country);
    CREATE INDEX IF NOT EXISTS idx_contacts_vat_valid ON contacts(vat_valid);
    CREATE INDEX IF NOT EXISTS idx_invoices_reverse_charge ON invoices(reverse_charge);
  `);

  console.log('Migration 018 completed successfully');
}

if (require.main === module) {
  const db = openDatabase();
  migrate(db);
  db.close();
}

module.exports = migrate;
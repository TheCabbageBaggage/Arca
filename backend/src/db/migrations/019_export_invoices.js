const { openDatabase } = require('../client');

/**
 * Migration 019: Export invoice support
 * Adds export invoice type and related fields for non-EU exports with 0% VAT
 */
function migrate(db) {
  console.log('Running migration 019: Export invoice support...');

  // Helper function to check if column exists
  function columnExists(table, column) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    return columns.some(col => col.name === column);
  }

  // Add vat_type to invoices table (standard, export, reverse_charge)
  if (!columnExists('invoices', 'vat_type')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN vat_type TEXT NOT NULL DEFAULT 'standard' CHECK (vat_type IN ('standard', 'export', 'reverse_charge'))`);
  }

  // Add export-specific fields to invoices table
  if (!columnExists('invoices', 'export_certificate')) {
    db.exec('ALTER TABLE invoices ADD COLUMN export_certificate INTEGER NOT NULL DEFAULT 0 CHECK (export_certificate IN (0, 1))');
  }
  if (!columnExists('invoices', 'shipment_date')) {
    db.exec('ALTER TABLE invoices ADD COLUMN shipment_date TEXT');
  }
  if (!columnExists('invoices', 'port_of_entry')) {
    db.exec('ALTER TABLE invoices ADD COLUMN port_of_entry TEXT');
  }
  if (!columnExists('invoices', 'country_of_origin')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN country_of_origin TEXT NOT NULL DEFAULT 'AT'`);
  }
  if (!columnExists('invoices', 'customs_declaration')) {
    db.exec('ALTER TABLE invoices ADD COLUMN customs_declaration TEXT');
  }

  // Note: vat_country field is already added by migration 018
  // We don't need to add it again

  // Update existing invoices: set vat_type based on current tax_rate and reverse_charge logic
  // Note: This is a best-effort update. New invoices should use explicit vat_type.
  db.exec(`
    UPDATE invoices 
    SET vat_type = CASE 
      WHEN tax_rate = 0 AND reverse_charge = 1 THEN 'reverse_charge'
      WHEN tax_rate = 0 AND reverse_charge = 0 THEN 'export'
      ELSE 'standard'
    END
    WHERE vat_type IS NULL OR vat_type = ''
  `);

  // Add index for filtering by vat type (if not exists)
  db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_vat_type ON invoices(vat_type)');
  
  // Add index for export certificate status (if not exists)
  db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_export_certificate ON invoices(export_certificate)');
  
  // Add index for shipment date (if not exists)
  db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_shipment_date ON invoices(shipment_date)');

  // Note: idx_contacts_vat_country is already created by migration 018

  console.log('Migration 019 completed successfully');
}

if (require.main === module) {
  const db = openDatabase();
  migrate(db);
  db.close();
}

module.exports = migrate;

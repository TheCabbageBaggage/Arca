function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}

function addColumnIfMissing(db, table, columnSql, columnName) {
  if (!hasColumn(db, table, columnName)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnSql}`);
  }
}

module.exports = {
  up(db) {
    addColumnIfMissing(db, 'invoices', 'business_partner_id INTEGER REFERENCES contacts(id)', 'business_partner_id');
    addColumnIfMissing(db, 'invoices', 'business_partner_name TEXT', 'business_partner_name');

    addColumnIfMissing(db, 'payments', 'business_partner_id INTEGER REFERENCES contacts(id)', 'business_partner_id');
    addColumnIfMissing(db, 'payments', 'business_partner_name TEXT', 'business_partner_name');

    db.exec(`
      UPDATE invoices
      SET business_partner_id = COALESCE(business_partner_id, contact_id)
      WHERE business_partner_id IS NULL AND contact_id IS NOT NULL;

      UPDATE invoices
      SET business_partner_name = (
        SELECT c.name FROM contacts c WHERE c.id = invoices.business_partner_id
      )
      WHERE business_partner_id IS NOT NULL
        AND (business_partner_name IS NULL OR TRIM(business_partner_name) = '');

      UPDATE payments
      SET business_partner_id = COALESCE(business_partner_id, contact_id)
      WHERE business_partner_id IS NULL AND contact_id IS NOT NULL;

      UPDATE payments
      SET business_partner_name = (
        SELECT c.name FROM contacts c WHERE c.id = payments.business_partner_id
      )
      WHERE business_partner_id IS NOT NULL
        AND (business_partner_name IS NULL OR TRIM(business_partner_name) = '');

      CREATE INDEX IF NOT EXISTS idx_invoices_business_partner_id ON invoices(business_partner_id);
      CREATE INDEX IF NOT EXISTS idx_payments_business_partner_id ON payments(business_partner_id);
    `);
  }
};

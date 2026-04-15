-- Migration 019: Export invoice support
-- Adds export invoice type and related fields for non-EU exports with 0% VAT

-- Helper: Check if column exists (SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN)
-- We'll use a different approach: try to add and ignore errors

-- Add vat_type to invoices table (standard, export, reverse_charge)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- We'll add it and ignore if it already exists
BEGIN TRY
  ALTER TABLE invoices ADD COLUMN vat_type TEXT NOT NULL DEFAULT 'standard' CHECK (vat_type IN ('standard', 'export', 'reverse_charge'));
EXCEPTION WHEN duplicate_column_name THEN
  -- Column already exists, do nothing
END;

-- Add export-specific fields to invoices table
BEGIN TRY
  ALTER TABLE invoices ADD COLUMN export_certificate INTEGER NOT NULL DEFAULT 0 CHECK (export_certificate IN (0, 1));
EXCEPTION WHEN duplicate_column_name THEN
END;

BEGIN TRY
  ALTER TABLE invoices ADD COLUMN shipment_date TEXT;
EXCEPTION WHEN duplicate_column_name THEN
END;

BEGIN TRY
  ALTER TABLE invoices ADD COLUMN port_of_entry TEXT;
EXCEPTION WHEN duplicate_column_name THEN
END;

BEGIN TRY
  ALTER TABLE invoices ADD COLUMN country_of_origin TEXT NOT NULL DEFAULT 'AT';
EXCEPTION WHEN duplicate_column_name THEN
END;

BEGIN TRY
  ALTER TABLE invoices ADD COLUMN customs_declaration TEXT;
EXCEPTION WHEN duplicate_column_name THEN
END;

-- Note: vat_country field is already added by migration 018
-- We don't need to add it again

-- Update existing invoices: set vat_type based on current tax_rate and reverse_charge logic
-- Note: This is a best-effort update. New invoices should use explicit vat_type.
UPDATE invoices 
SET vat_type = CASE 
  WHEN tax_rate = 0 AND reverse_charge = 1 THEN 'reverse_charge'
  WHEN tax_rate = 0 AND reverse_charge = 0 THEN 'export'
  ELSE 'standard'
END
WHERE vat_type IS NULL OR vat_type = '';

-- Add index for filtering by vat type (if not exists)
CREATE INDEX IF NOT EXISTS idx_invoices_vat_type ON invoices(vat_type);

-- Add index for export certificate status (if not exists)
CREATE INDEX IF NOT EXISTS idx_invoices_export_certificate ON invoices(export_certificate);

-- Add index for shipment date (if not exists)
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_date ON invoices(shipment_date);

-- Note: idx_contacts_vat_country is already created by migration 018

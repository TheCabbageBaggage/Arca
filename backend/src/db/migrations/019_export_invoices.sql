-- Migration 019: Export invoice support
-- Adds export invoice type and related fields for non-EU exports with 0% VAT

-- Add vat_type to invoices table (standard, export, reverse_charge)
ALTER TABLE invoices ADD COLUMN vat_type TEXT NOT NULL DEFAULT 'standard' CHECK (vat_type IN ('standard', 'export', 'reverse_charge'));

-- Add export-specific fields to invoices table
ALTER TABLE invoices ADD COLUMN export_certificate INTEGER NOT NULL DEFAULT 0 CHECK (export_certificate IN (0, 1));
ALTER TABLE invoices ADD COLUMN shipment_date TEXT;
ALTER TABLE invoices ADD COLUMN port_of_entry TEXT;
ALTER TABLE invoices ADD COLUMN country_of_origin TEXT NOT NULL DEFAULT 'AT';
ALTER TABLE invoices ADD COLUMN customs_declaration TEXT;

-- Add vat_country field to contacts table for export detection
ALTER TABLE contacts ADD COLUMN vat_country TEXT;

-- Update existing invoices: set vat_type based on current tax_rate and reverse_charge logic
-- Note: This is a best-effort update. New invoices should use explicit vat_type.
UPDATE invoices 
SET vat_type = CASE 
  WHEN tax_rate = 0 AND reverse_charge = 1 THEN 'reverse_charge'
  WHEN tax_rate = 0 AND reverse_charge = 0 THEN 'export'
  ELSE 'standard'
END;

-- Add index for filtering by vat type
CREATE INDEX IF NOT EXISTS idx_invoices_vat_type ON invoices(vat_type);

-- Add index for export certificate status
CREATE INDEX IF NOT EXISTS idx_invoices_export_certificate ON invoices(export_certificate);

-- Add index for shipment date
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_date ON invoices(shipment_date);

-- Add index for vat_country on contacts
CREATE INDEX IF NOT EXISTS idx_contacts_vat_country ON contacts(vat_country);
EOF"
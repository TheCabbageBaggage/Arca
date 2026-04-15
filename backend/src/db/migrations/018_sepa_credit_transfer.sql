-- Migration 018: SEPA Credit Transfer support
-- Adds tables for SEPA file generation and links to payments

CREATE TABLE IF NOT EXISTS sepa_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  xml_content TEXT NOT NULL,
  payment_count INTEGER NOT NULL DEFAULT 0 CHECK (payment_count >= 0),
  total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  initiator_name TEXT NOT NULL,
  initiator_iban TEXT NOT NULL,
  initiator_bic TEXT NOT NULL,
  message_id TEXT NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  system_log_id TEXT REFERENCES system_log(log_id),
  transaction_log_id TEXT REFERENCES transaction_log(txn_id)
);

-- Add SEPA reference columns to payments table
ALTER TABLE payments ADD COLUMN sepa_file_id INTEGER REFERENCES sepa_files(id);
ALTER TABLE payments ADD COLUMN included_in_sepa_at DATETIME;

-- Add IBAN and BIC columns to contacts for SEPA payments
ALTER TABLE contacts ADD COLUMN iban TEXT;
ALTER TABLE contacts ADD COLUMN bic TEXT;

-- Add IBAN and BIC columns to payments (cached from contact at time of payment)
ALTER TABLE payments ADD COLUMN recipient_iban TEXT;
ALTER TABLE payments ADD COLUMN recipient_bic TEXT;

CREATE INDEX IF NOT EXISTS idx_sepa_files_created_at ON sepa_files(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_sepa_file ON payments(sepa_file_id);
CREATE INDEX IF NOT EXISTS idx_payments_included_in_sepa ON payments(included_in_sepa_at);
CREATE INDEX IF NOT EXISTS idx_contacts_iban ON contacts(iban);
CREATE INDEX IF NOT EXISTS idx_contacts_bic ON contacts(bic);


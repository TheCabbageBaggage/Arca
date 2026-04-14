-- Arca Bootstrap Seed Script
-- Minimal seed data for initial prototype testing
-- This is idempotent - can be run multiple times safely
-- Usage: sqlite3 /path/to/arca.db < scripts/seed-bootstrap.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Bootstrap admin is handled automatically by auth.repository.js on first login
-- via the BOOTSTRAP_ADMIN_* env vars in .env file
-- No manual insertion needed - the system auto-creates the admin on first API call

-- Optional: Add a sample contact for testing (idempotent)
INSERT OR IGNORE INTO contacts (
  contact_no,
  type,
  name,
  company,
  email,
  phone,
  is_active
) VALUES (
  'CONT-001',
  'debtor',
  'Sample Customer Ltd',
  'Sample Customer Ltd',
  'customer@example.com',
  '+1-555-1234',
  1
);

-- Print confirmation
SELECT 'Bootstrap seed complete. Bootstrap admin auto-created on first login via auth.repository.js' AS message;

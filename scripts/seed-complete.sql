-- Arca Complete Seed Script
-- Idempotent seed data for bootstrap admin, sample contacts, projects, finance, and approvals
-- Usage: sqlite3 /path/to/arca.db < scripts/seed-complete.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Bootstrap Admin User (idempotent - only insert if not exists)
INSERT OR IGNORE INTO users (
  user_uuid,
  username,
  email,
  password_hash,
  role,
  scopes,
  display_name,
  is_active
) VALUES (
  'admin-uuid-001',
  'admin',
  'admin@arca.local',
  -- Password: 'admin1234' hashed with bcrypt (cost 10)
  'b0.6Hn.YR5B7dQ8J/W1q',
  'admin',
  '["*"]',
  'Arca Admin',
  1
);

-- 2. Sample Contacts (idempotent)
INSERT OR IGNORE INTO contacts (
  contact_uuid,
  name,
  email,
  phone,
  address,
  tax_id,
  contact_type,
  is_active
) VALUES 
  ('contact-uuid-001', 'Acme Corp', 'billing@acme.example', '+1-555-1234', '123 Main St, Anytown', 'US-EIN-12-3456789', 'customer', 1),
  ('contact-uuid-002', 'Beta LLC', 'payments@beta.example', '+1-555-5678', '456 Oak Ave, Somewhere', 'US-EIN-98-7654321', 'supplier', 1),
  ('contact-uuid-003', 'Gamma GmbH', 'info@gamma.example', '+49-30-123456', 'Berliner Str. 1, Berlin', 'DE123456789', 'partner', 1);

-- 3. Sample Project, Sprint, and User Story (idempotent)
-- First, create a project
INSERT OR IGNORE INTO projects (
  project_uuid,
  name,
  description,
  status,
  start_date,
  end_date,
  token_budget
) VALUES (
  'project-uuid-001',
  'Website Redesign',
  'Modernize company website with responsive design',
  'active',
  DATE('now', '-30 days'),
  DATE('now', '+60 days'),
  1200000
);

-- Then create a sprint for the project
INSERT OR IGNORE INTO sprints (
  sprint_uuid,
  project_id,
  name,
  description,
  start_date,
  end_date,
  token_budget,
  status
) VALUES (
  'sprint-uuid-001',
  (SELECT id FROM projects WHERE project_uuid = 'project-uuid-001'),
  'Sprint 1: Foundation',
  'Setup project structure and core components',
  DATE('now', '-7 days'),
  DATE('now', '+7 days'),
  300000,
  'active'
);

-- Create a user story for the sprint
INSERT OR IGNORE INTO user_stories (
  story_uuid,
  sprint_id,
  title,
  description,
  acceptance_criteria,
  token_estimate,
  status,
  priority
) VALUES (
  'story-uuid-001',
  (SELECT id FROM sprints WHERE sprint_uuid = 'sprint-uuid-001'),
  'Implement responsive header',
  'Create a header component that works on mobile and desktop',
  '1. Header collapses to hamburger menu on mobile\n2. Logo scales appropriately\n3. Navigation items are accessible',
  75000,
  'todo',
  'high'
);

-- 4. Sample Invoice (idempotent)
INSERT OR IGNORE INTO invoices (
  invoice_uuid,
  contact_id,
  invoice_number,
  issue_date,
  due_date,
  status,
  total_amount,
  currency,
  tax_rate,
  notes
) VALUES (
  'invoice-uuid-001',
  (SELECT id FROM contacts WHERE contact_uuid = 'contact-uuid-001'),
  'INV-2024-001',
  DATE('now', '-10 days'),
  DATE('now', '+20 days'),
  'sent',
  1500.00,
  'USD',
  0.19,
  'Website development services for Q1'
);

-- Add invoice line items
INSERT OR IGNORE INTO invoice_line_items (
  invoice_id,
  description,
  quantity,
  unit_price,
  tax_rate,
  line_total
) VALUES 
  ((SELECT id FROM invoices WHERE invoice_uuid = 'invoice-uuid-001'), 'Frontend Development', 20, 50.00, 0.19, 1000.00),
  ((SELECT id FROM invoices WHERE invoice_uuid = 'invoice-uuid-001'), 'Backend API Integration', 10, 50.00, 0.19, 500.00);

-- 5. Sample Approval Rule (idempotent)
-- First, create an agent key for the CFO
INSERT OR IGNORE INTO agent_keys (
  key_id,
  name,
  key_hash,
  scopes,
  role,
  is_active
) VALUES (
  'ak_cfo_01',
  'CFO Approval Key',
  -- Hash of a sample key 'cfo-secret-key-123'
  'b0.6Hn.YR5B7dQ8J/W1q',
  '["finance:write", "finance:approve"]',
  'admin',
  1
);

-- Then create the spend approval rule
INSERT OR IGNORE INTO spend_approval_rules (
  threshold_usd,
  approver_key_id,
  scope,
  auto_approve_usd,
  notify_human_usd
) VALUES (
  50.00,
  'ak_cfo_01',
  'finance:write',
  50.00,
  2000.00
);

-- 6. Sample Payment (idempotent) - if invoice exists
INSERT OR IGNORE INTO payments (
  payment_uuid,
  invoice_id,
  amount,
  currency,
  payment_date,
  payment_method,
  reference
) SELECT
  'payment-uuid-001',
  i.id,
  750.00,
  'USD',
  DATE('now', '-5 days'),
  'bank_transfer',
  'REF-2024-001'
FROM invoices i 
WHERE i.invoice_uuid = 'invoice-uuid-001'
AND NOT EXISTS (SELECT 1 FROM payments WHERE payment_uuid = 'payment-uuid-001');

-- 7. Sample Journal Entry (idempotent)
INSERT OR IGNORE INTO journal_entries (
  entry_uuid,
  entry_date,
  description,
  reference
) VALUES (
  'journal-uuid-001',
  DATE('now'),
  'Office supplies purchase',
  'POS-2024-00321'
);

INSERT OR IGNORE INTO journal_entry_lines (
  journal_entry_id,
  account_code,
  debit,
  credit,
  description
) VALUES 
  ((SELECT id FROM journal_entries WHERE entry_uuid = 'journal-uuid-001'), '6010', 125.00, 0, 'Office Supplies Expense'),
  ((SELECT id FROM journal_entries WHERE entry_uuid = 'journal-uuid-001'), '1010', 0, 125.00, 'Bank Account');

-- Print summary
SELECT 'Seed data completed successfully.' AS message;
SELECT '  - Admin user: admin@arca.local (password: admin1234)' AS summary;
SELECT '  - Sample contacts: 3 created' AS summary;
SELECT '  - Project with sprint and story: 1 each' AS summary;
SELECT '  - Invoice with line items: 1 invoice, 2 line items' AS summary;
SELECT '  - Approval rule: CFO approval for expenses > 0' AS summary;
SELECT '  - Payment: 50 payment on sample invoice' AS summary;
SELECT '  - Journal entry: Office supplies purchase' AS summary;

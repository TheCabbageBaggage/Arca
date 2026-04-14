-- Arca Complete Seed Script
-- Comprehensive seed data for prototype demo
-- This is idempotent - can be run multiple times safely
-- Usage: sqlite3 /path/to/arca.db < scripts/seed-complete.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- NOTE: Bootstrap admin is handled automatically by auth.repository.js on first login
-- The system reads BOOTSTRAP_ADMIN_EMAIL/PASSWORD from .env and creates user if missing

-- 1. Sample Contacts (5 contacts with varied types: debtor/creditor)
INSERT OR IGNORE INTO contacts (contact_no, type, name, company, email, phone, tax_id, is_active) VALUES
  ('CONT-001', 'debtor', 'Acme Corporation', 'Acme Corp', 'billing@acme.example', '+1-555-0101', 'US123456789', 1),
  ('CONT-002', 'creditor', 'TechSupplies Inc', 'TechSupplies', 'orders@techsupplies.example', '+1-555-0102', 'US987654321', 1),
  ('CONT-003', 'debtor', 'Global Services GmbH', 'Global Services', 'contact@globalservices.example', '+49-30-123456', 'DE123456789', 1),
  ('CONT-004', 'creditor', 'Office Depot', 'Office Depot', 'orders@officedepot.example', '+1-555-0103', 'US555666777', 1),
  ('CONT-005', 'debtor', 'MegaCorp Industries', 'MegaCorp', 'procurement@megacorp.example', '+1-555-0104', 'US888999000', 1);

-- 2. Sample Project
INSERT OR IGNORE INTO projects (project_no, name, code, status, methodology, start_date, end_date, token_budget, notes) VALUES
  ('PROJ-001', 'Website Redesign', 'WEB-RD', 'active', 'scrum', DATE('now', '-30 days'), DATE('now', '+60 days'), 50000, 'Modernize company website with responsive design');

-- 3. Sample Sprint for the project (using correct schema: sprint_no, goal, velocity_tokens, etc.)
INSERT OR IGNORE INTO sprints (sprint_no, project_id, name, goal, start_date, end_date, velocity_tokens, status) VALUES
  ('SPRINT-001', (SELECT id FROM projects WHERE project_no = 'PROJ-001'), 'Sprint 1: Foundation', 'Setup project structure and core components', DATE('now', '-7 days'), DATE('now', '+7 days'), 15000, 'active');

-- 4. Sample User Story for the sprint (using correct schema: story_no, project_id, acceptance_criteria_json)
INSERT OR IGNORE INTO user_stories (story_no, project_id, sprint_id, title, description, acceptance_criteria_json, estimated_tokens, status, priority) VALUES
  ('STORY-001',
   (SELECT id FROM projects WHERE project_no = 'PROJ-001'),
   (SELECT id FROM sprints WHERE sprint_no = 'SPRINT-001'),
   'Implement responsive navigation',
   'Create a navigation component that adapts to mobile and desktop',
   '["Hamburger menu on mobile","Full nav bar on desktop","Smooth animations"]',
   5000,
   'backlog',
   1);

-- 5. Sample Invoice (requires an active contact - using correct schema)
INSERT OR IGNORE INTO invoices (invoice_no, invoice_type, contact_id, issue_date, due_date, booking_period, status, currency, subtotal_net, tax_rate, tax_amount, total_gross, description, lines_json, created_by_type, created_by_id, created_by_name) VALUES
  ('INV-2024-001', 'invoice', 
   (SELECT id FROM contacts WHERE contact_no = 'CONT-001'),
   DATE('now', '-10 days'),
   DATE('now', '+20 days'),
   strftime('%Y-%m', 'now'),
   'issued',
   'USD',
   1500.00,
   0.19,
   285.00,
   1785.00,
   'Website development services',
   '[{"description":"Frontend Development","quantity":20,"unit_price":50,"line_total":1000},{"description":"Backend Integration","quantity":10,"unit_price":50,"line_total":500}]',
   'user',
   '1',
   'System Seed');

-- 6. Sample Payment on the invoice
INSERT OR IGNORE INTO payments (payment_no, contact_id, invoice_id, payment_date, booking_period, payment_method, currency, amount_net, tax_amount, total_amount, description, created_by_type, created_by_id, created_by_name) VALUES
  ('PAY-2024-001',
   (SELECT id FROM contacts WHERE contact_no = 'CONT-001'),
   (SELECT id FROM invoices WHERE invoice_no = 'INV-2024-001'),
   DATE('now', '-5 days'),
   strftime('%Y-%m', 'now'),
   'bank_transfer',
   'USD',
   892.50,
   142.50,
   1035.00,
   'Partial payment for INV-2024-001',
   'user',
   '1',
   'System Seed');

-- Update invoice paid_amount and status after payment
UPDATE invoices SET 
  paid_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM payments WHERE invoice_id = invoices.id),
  balance_amount = total_gross - (SELECT COALESCE(SUM(total_amount), 0) FROM payments WHERE invoice_id = invoices.id),
  status = CASE 
    WHEN (SELECT COALESCE(SUM(total_amount), 0) FROM payments WHERE invoice_id = invoices.id) >= total_gross THEN 'paid'
    WHEN (SELECT COALESCE(SUM(total_amount), 0) FROM payments WHERE invoice_id = invoices.id) > 0 THEN 'partially_paid'
    ELSE status
  END
WHERE invoice_no = 'INV-2024-001';

-- 7. Sample Approval Rule (spend approval)
-- First ensure we have an agent key for CFO
INSERT OR IGNORE INTO agent_keys (key_id, name, key_hash, scopes, role, is_active) VALUES
  ('ak_cfo_001', 'CFO Approval Key', '$2a$10$samplehashfortesting', '["finance:write","finance:approve"]', 'admin', 1);

INSERT OR IGNORE INTO spend_approval_rules (threshold_usd, approver_key_id, scope, auto_approve_usd, notify_human_usd) VALUES
  (100.00, 'ak_cfo_001', 'finance:write', 50.00, 1000.00);

-- Print summary
SELECT 'Seed data completed successfully.' AS message;
SELECT '  - 5 sample contacts created (mix of debtors/creditors)' AS summary;
SELECT '  - 1 project created: Website Redesign' AS summary;
SELECT '  - 1 sprint created: Sprint 1: Foundation' AS summary;
SELECT '  - 1 user story created: Implement responsive navigation' AS summary;
SELECT '  - 1 invoice created: INV-2024-001 ($1,785.00)' AS summary;
SELECT '  - 1 payment created: PAY-2024-001 ($1,035.00)' AS summary;
SELECT '  - 1 approval rule created: CFO approval for expenses > $100' AS summary;

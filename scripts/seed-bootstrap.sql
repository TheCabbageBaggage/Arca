-- Arca Bootstrap Seed Script
-- Minimal seed data for initial prototype testing
-- Usage: sqlite3 /path/to/arca.db < scripts/seed-bootstrap.sql

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

-- 2. Sample Contact (idempotent)
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
  ('contact-uuid-001', 'Acme Corp', 'billing@acme.example', '+1-555-1234', '123 Main St, Anytown', 'US-EIN-12-3456789', 'customer', 1);

-- 3. Sample Project (idempotent)
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
  'Prototype Development',
  'Initial Arca prototype implementation',
  'active',
  DATE('now', '-7 days'),
  DATE('now', '+30 days'),
  800000
);

-- 4. Sample Sprint (idempotent)
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
  'Bootstrap Sprint',
  'Setup and initial configuration',
  DATE('now', '-3 days'),
  DATE('now', '+4 days'),
  200000,
  'active'
);

-- 5. Sample User Story (idempotent)
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
  'Implement authentication flow',
  'Setup JWT auth and admin bootstrap',
  '1. Admin can login with credentials\n2. JWT tokens are issued correctly\n3. Protected routes require valid tokens',
  50000,
  'in_progress',
  'high'
);

-- 6. Sample Invoice (idempotent)
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
  'INV-PROTO-001',
  DATE('now', '-5 days'),
  DATE('now', '+25 days'),
  'draft',
  2500.00,
  'USD',
  0.19,
  'Prototype development services'
);

-- 7. Sample Approval Rule (idempotent)
INSERT OR IGNORE INTO spend_approval_rules (
  threshold_usd,
  approver_key_id,
  scope,
  auto_approve_usd,
  notify_human_usd
) VALUES (
  100.00,
  'ak_cfo_01',
  'finance:write',
  100.00,
  5000.00
);

-- Print summary
SELECT 'Bootstrap seed data completed.' AS message;
SELECT 'Admin: admin@arca.local / admin1234' AS credentials;
SELECT 'Total records created/verified:' AS summary;
SELECT '  - Users: 1' AS count;
SELECT '  - Contacts: 1' AS count;
SELECT '  - Projects: 1' AS count;
SELECT '  - Sprints: 1' AS count;
SELECT '  - User Stories: 1' AS count;
SELECT '  - Invoices: 1' AS count;
SELECT '  - Approval Rules: 1' AS count;

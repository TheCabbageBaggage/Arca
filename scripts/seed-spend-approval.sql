-- Example spend-approval policy
-- Usage:
-- sqlite3 /path/to/arca.db < scripts/seed-spend-approval.sql

INSERT INTO spend_approval_rules (
  threshold_usd,
  approver_key_id,
  scope,
  auto_approve_usd,
  notify_human_usd
) VALUES
  (50.00, 'ak_cfo_01', 'finance:write', 50.00, 2000.00);

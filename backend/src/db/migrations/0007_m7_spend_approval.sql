CREATE TABLE IF NOT EXISTS spend_approval_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threshold_usd REAL NOT NULL CHECK (threshold_usd >= 0),
  approver_key_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '*',
  auto_approve_usd REAL,
  notify_human_usd REAL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spend_approval_rules_scope_threshold
  ON spend_approval_rules(scope, threshold_usd);

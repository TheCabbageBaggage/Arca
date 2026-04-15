CREATE TABLE IF NOT EXISTS report_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_type TEXT NOT NULL CHECK (group_type IN ('department', 'project', 'cost_center')),
  group_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_budgets_group_period
  ON report_budgets(group_type, group_name, period_start, period_end);

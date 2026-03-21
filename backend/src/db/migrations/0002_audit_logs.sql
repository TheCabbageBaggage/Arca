CREATE TABLE IF NOT EXISTS system_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id TEXT NOT NULL UNIQUE,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
  source_type TEXT NOT NULL,
  source_id TEXT,
  source_name TEXT,
  module TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  summary TEXT NOT NULL,
  detail TEXT,
  session_id TEXT,
  request_id TEXT,
  ip_address TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ok', 'warn', 'error')),
  error_code TEXT,
  error_message TEXT,
  prev_hash TEXT,
  row_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_id TEXT NOT NULL UNIQUE,
  txn_sequence INTEGER NOT NULL UNIQUE,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  value_date DATE NOT NULL,
  booking_period TEXT NOT NULL,
  txn_type TEXT NOT NULL,
  document_ref TEXT,
  description TEXT NOT NULL,
  debit_account TEXT NOT NULL,
  credit_account TEXT NOT NULL,
  amount_net REAL NOT NULL CHECK (amount_net >= 0),
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  amount_gross REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  fx_rate REAL NOT NULL DEFAULT 1.0,
  amount_base_currency REAL NOT NULL,
  cost_center TEXT,
  project_id INTEGER,
  contact_id INTEGER,
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  system_log_id TEXT,
  is_storno INTEGER NOT NULL DEFAULT 0 CHECK (is_storno IN (0, 1)),
  storno_of_txn TEXT,
  period_locked INTEGER NOT NULL DEFAULT 0 CHECK (period_locked IN (0, 1)),
  prev_hash TEXT,
  row_hash TEXT NOT NULL,
  nextcloud_path TEXT
);

CREATE TRIGGER IF NOT EXISTS system_log_no_update
BEFORE UPDATE ON system_log
BEGIN
  SELECT RAISE(ABORT, 'system_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS system_log_no_delete
BEFORE DELETE ON system_log
BEGIN
  SELECT RAISE(ABORT, 'system_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS transaction_log_no_update
BEFORE UPDATE ON transaction_log
BEGIN
  SELECT RAISE(ABORT, 'transaction_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS transaction_log_no_delete
BEFORE DELETE ON transaction_log
BEGIN
  SELECT RAISE(ABORT, 'transaction_log is append-only');
END;

CREATE INDEX IF NOT EXISTS idx_system_log_occurred_at ON system_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_transaction_log_txn_sequence ON transaction_log(txn_sequence);
CREATE INDEX IF NOT EXISTS idx_transaction_log_posted_at ON transaction_log(posted_at);

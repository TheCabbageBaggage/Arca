CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'invoice' CHECK (invoice_type IN ('invoice', 'credit_note')),
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  issue_date DATE NOT NULL,
  due_date DATE,
  booking_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'cancelled')),
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_net REAL NOT NULL DEFAULT 0 CHECK (subtotal_net >= 0),
  tax_rate REAL NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_gross REAL NOT NULL DEFAULT 0 CHECK (total_gross >= 0),
  paid_amount REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  balance_amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  lines_json TEXT NOT NULL DEFAULT '[]',
  nextcloud_path TEXT,
  transaction_log_id TEXT REFERENCES transaction_log(txn_id),
  system_log_id TEXT REFERENCES system_log(log_id),
  is_storno INTEGER NOT NULL DEFAULT 0 CHECK (is_storno IN (0, 1)),
  storno_of_invoice_id INTEGER REFERENCES invoices(id),
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_no TEXT NOT NULL UNIQUE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  invoice_id INTEGER REFERENCES invoices(id),
  payment_date DATE NOT NULL,
  booking_period TEXT NOT NULL,
  payment_method TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  amount_net REAL NOT NULL DEFAULT 0 CHECK (amount_net >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  description TEXT,
  nextcloud_path TEXT,
  transaction_log_id TEXT REFERENCES transaction_log(txn_id),
  system_log_id TEXT REFERENCES system_log(log_id),
  is_storno INTEGER NOT NULL DEFAULT 0 CHECK (is_storno IN (0, 1)),
  storno_of_payment_id INTEGER REFERENCES payments(id),
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_no TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  booking_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
  description TEXT NOT NULL,
  lines_json TEXT NOT NULL DEFAULT '[]',
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_debit REAL NOT NULL DEFAULT 0 CHECK (total_debit >= 0),
  total_credit REAL NOT NULL DEFAULT 0 CHECK (total_credit >= 0),
  nextcloud_path TEXT,
  transaction_log_id TEXT REFERENCES transaction_log(txn_id),
  system_log_id TEXT REFERENCES system_log(log_id),
  is_storno INTEGER NOT NULL DEFAULT 0 CHECK (is_storno IN (0, 1)),
  storno_of_entry_id INTEGER REFERENCES journal_entries(id),
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL UNIQUE,
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
  locked_at DATETIME,
  locked_by TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_contact_status ON invoices(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_period ON invoices(booking_period);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_log ON invoices(transaction_log_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact_date ON payments(contact_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_period ON payments(booking_period);
CREATE INDEX IF NOT EXISTS idx_journal_entries_booking_period ON journal_entries(booking_period);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction_log ON journal_entries(transaction_log_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_locked ON accounting_periods(is_locked, period);

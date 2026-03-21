CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_no TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('debtor', 'creditor')),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  payment_terms_json TEXT NOT NULL DEFAULT '{}',
  accounting_json TEXT NOT NULL DEFAULT '{}',
  tax_id TEXT,
  nextcloud_path TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  nextcloud_path TEXT NOT NULL,
  uploaded_by_type TEXT,
  uploaded_by_id TEXT,
  uploaded_by_name TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_record_lookup ON documents(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_nextcloud_path ON documents(nextcloud_path);

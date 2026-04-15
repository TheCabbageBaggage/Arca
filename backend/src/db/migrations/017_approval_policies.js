module.exports.up = (db) => {
  db.exec(
    "CREATE TABLE IF NOT EXISTS approval_policies (" +
    " id INTEGER PRIMARY KEY AUTOINCREMENT," +
    " name TEXT NOT NULL," +
    " scope TEXT NOT NULL CHECK (scope IN ('invoice', 'payment', 'journal'))," +
    " threshold_amount REAL NOT NULL CHECK (threshold_amount >= 0)," +
    " cost_center TEXT," +
    " approver_role TEXT NOT NULL," +
    " created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    " updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" +
    ");" +
    "CREATE TABLE IF NOT EXISTS approval_requests (" +
    " id INTEGER PRIMARY KEY AUTOINCREMENT," +
    " policy_id INTEGER NOT NULL REFERENCES approval_policies(id)," +
    " reference_type TEXT NOT NULL," +
    " reference_id TEXT," +
    " requester_id TEXT," +
    " status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))," +
    " decision_at DATETIME," +
    " approver_id TEXT," +
    " reason TEXT," +
    " created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" +
    ");" +
    "CREATE TABLE IF NOT EXISTS approval_audit (" +
    " id INTEGER PRIMARY KEY AUTOINCREMENT," +
    " request_id INTEGER NOT NULL REFERENCES approval_requests(id)," +
    " action TEXT NOT NULL," +
    " actor_id TEXT," +
    " timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    " payload TEXT," +
    " created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" +
    ");" +
    "CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);" +
    "CREATE INDEX IF NOT EXISTS idx_approval_requests_policy_id ON approval_requests(policy_id);" +
    "CREATE INDEX IF NOT EXISTS idx_approval_audit_request_id ON approval_audit(request_id);"
  );
};

module.exports.up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fx_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      rate REAL NOT NULL CHECK (rate > 0),
      rate_source TEXT,
      effective_date DATE NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(base_currency, quote_currency, effective_date)
    );

    CREATE INDEX IF NOT EXISTS idx_fx_rates_pair_date
      ON fx_rates(base_currency, quote_currency, effective_date);

    CREATE INDEX IF NOT EXISTS idx_fx_rates_effective_date
      ON fx_rates(effective_date);
  `);
};

const { openDatabase } = require("../../db/client");

class FxRepository {
  db() {
    return openDatabase();
  }

  upsertRate({ base_currency, quote_currency, rate, rate_source, effective_date }) {
    const db = this.db();
    db.prepare(
      `INSERT INTO fx_rates (base_currency, quote_currency, rate, rate_source, effective_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(base_currency, quote_currency, effective_date)
       DO UPDATE SET rate = excluded.rate, rate_source = excluded.rate_source`
    ).run(base_currency, quote_currency, rate, rate_source || null, effective_date);

    return this.getRate({ base_currency, quote_currency, date: effective_date });
  }

  getRate({ base_currency, quote_currency, date }) {
    const db = this.db();
    return db.prepare(
      `SELECT * FROM fx_rates
       WHERE base_currency = ? AND quote_currency = ? AND effective_date <= ?
       ORDER BY effective_date DESC, id DESC
       LIMIT 1`
    ).get(base_currency, quote_currency, date || new Date().toISOString().slice(0, 10)) || null;
  }

  listRates(limit = 100) {
    const db = this.db();
    return db.prepare(
      `SELECT * FROM fx_rates ORDER BY effective_date DESC, id DESC LIMIT ?`
    ).all(limit);
  }

  exposure(asOf) {
    const db = this.db();
    return db.prepare(
      `SELECT currency, SUM(amount_base_currency) AS exposure_base
       FROM transaction_log
       WHERE date(posted_at) <= date(?)
       GROUP BY currency
       ORDER BY currency ASC`
    ).all(asOf);
  }

  revalue(asOf) {
    const rows = this.exposure(asOf);
    return {
      as_of: asOf,
      rows,
      total_rows: rows.length
    };
  }
}

module.exports = FxRepository;

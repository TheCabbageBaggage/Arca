const FxRepository = require("./repository");

class FxService {
  constructor(repository = new FxRepository()) {
    this.repository = repository;
  }

  createOrUpdateRate(payload = {}) {
    const base = String(payload.base_currency || payload.base || "").toUpperCase();
    const quote = String(payload.quote_currency || payload.quote || "").toUpperCase();
    const rate = Number(payload.rate);
    const effectiveDate = payload.effective_date || payload.date || new Date().toISOString().slice(0, 10);

    if (!base || !quote) {
      const e = new Error("base_currency and quote_currency are required");
      e.statusCode = 400;
      throw e;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      const e = new Error("rate must be > 0");
      e.statusCode = 400;
      throw e;
    }

    return this.repository.upsertRate({
      base_currency: base,
      quote_currency: quote,
      rate,
      rate_source: payload.rate_source || null,
      effective_date: effectiveDate
    });
  }

  getRate(query = {}) {
    const base = String(query.base || query.base_currency || "").toUpperCase();
    const quote = String(query.quote || query.quote_currency || "").toUpperCase();
    const date = query.date || new Date().toISOString().slice(0, 10);
    if (!base || !quote) {
      const e = new Error("base and quote are required");
      e.statusCode = 400;
      throw e;
    }
    const rate = this.repository.getRate({ base_currency: base, quote_currency: quote, date });
    if (!rate) {
      const e = new Error("FX rate not found");
      e.statusCode = 404;
      throw e;
    }
    return rate;
  }

  listRates() {
    return this.repository.listRates(300);
  }

  revalue(asOf) {
    return this.repository.revalue(asOf || new Date().toISOString().slice(0, 10));
  }

  exposure(asOf) {
    return this.repository.exposure(asOf || new Date().toISOString().slice(0, 10));
  }
}

module.exports = FxService;

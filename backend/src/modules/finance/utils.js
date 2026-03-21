const crypto = require('crypto');

function parseJson(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }

  if (typeof raw === 'object') {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toJson(value, fallback = '[]') {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function normalizePeriod(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.slice(0, 7);
  }

  return null;
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function periodFromDate(value) {
  const date = normalizeDate(value);
  if (!date) {
    return null;
  }
  return date.slice(0, 7);
}

function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function periodFromNow() {
  return new Date().toISOString().slice(0, 7);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'item';
}

function buildRowHash(row) {
  const payload = [
    row.txn_id,
    row.txn_sequence,
    row.posted_at,
    row.value_date,
    row.booking_period,
    row.txn_type,
    row.document_ref || '',
    row.description,
    row.debit_account,
    row.credit_account,
    row.amount_net,
    row.tax_rate,
    row.tax_amount,
    row.amount_gross,
    row.currency,
    row.fx_rate,
    row.amount_base_currency,
    row.cost_center || '',
    row.contact_id || '',
    row.created_by_type,
    row.created_by_id,
    row.created_by_name,
    row.prev_hash || ''
  ].join('|');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

function nextDocumentPath(kind, identifier, filename) {
  return `/ERP-Documents/Finance/${slugify(kind)}/${slugify(identifier)}/${slugify(filename)}`;
}

module.exports = {
  buildRowHash,
  isPositiveNumber,
  nextDocumentPath,
  normalizeDate,
  normalizePeriod,
  parseJson,
  periodFromDate,
  periodFromNow,
  slugify,
  toJson,
  toNumber
};

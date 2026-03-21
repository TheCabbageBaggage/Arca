const crypto = require('crypto');

function tableExists(db, name) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(name);
  return Boolean(row);
}

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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function periodFromDate(value) {
  const date = normalizeDate(value);
  return date ? date.slice(0, 7) : null;
}

function currentYear(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear();
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'item';
}

function buildCode(prefix, number, width = 3, year = null) {
  const padded = String(number).padStart(width, '0');
  return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function defaultSprintBudgetTokens() {
  return Number(process.env.TOKEN_SPRINT_BUDGET || 2400000);
}

function warnThreshold() {
  return Number(process.env.TOKEN_WARN_THRESHOLD || 0.85);
}

module.exports = {
  buildCode,
  currentYear,
  defaultSprintBudgetTokens,
  normalizeDate,
  normalizePeriod,
  parseJson,
  periodFromDate,
  sha256,
  slugify,
  tableExists,
  toJson,
  toNumber,
  warnThreshold
};

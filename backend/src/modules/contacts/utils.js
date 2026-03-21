function tableExists(db, name) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(name);
  return Boolean(row);
}

function normalizeContactType(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (raw === 'debtor' || raw === 'customer' || raw === 'client') {
    return 'debtor';
  }
  if (raw === 'creditor' || raw === 'vendor' || raw === 'supplier') {
    return 'creditor';
  }
  return null;
}

function prefixForType(type) {
  return type === 'creditor' ? 'V' : 'C';
}

function basePathForType(type) {
  return type === 'creditor' ? 'Vendors' : 'Customers';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function toJson(value) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

module.exports = {
  basePathForType,
  normalizeContactType,
  parseJson,
  prefixForType,
  slugify,
  tableExists,
  toJson
};

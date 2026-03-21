const { openDatabase } = require('../../db/client');
const {
  basePathForType,
  normalizeContactType,
  parseJson,
  prefixForType,
  slugify,
  tableExists,
  toJson
} = require('./utils');

function requireContactsTable(db) {
  if (!tableExists(db, 'contacts')) {
    const error = new Error('Missing contacts table. Run the contacts migration first.');
    error.statusCode = 500;
    throw error;
  }
}

class ContactsRepository {
  ensure() {
    const db = openDatabase();
    requireContactsTable(db);
    return db;
  }

  mapContact(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      contact_no: row.contact_no,
      type: row.type,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: parseJson(row.address_json, {}),
      payment_terms: parseJson(row.payment_terms_json, {}),
      accounting: parseJson(row.accounting_json, {}),
      tax_id: row.tax_id,
      nextcloud_path: row.nextcloud_path,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  listContacts(filters = {}) {
    const db = this.ensure();
    const clauses = [];
    const values = [];

    if (filters.type) {
      clauses.push('type = ?');
      values.push(filters.type);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM contacts ${where} ORDER BY contact_no ASC, id ASC`).all(...values);
    return rows.map((row) => this.mapContact(row));
  }

  getContactById(id) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM contacts WHERE id = ? LIMIT 1').get(Number(id));
    return this.mapContact(row);
  }

  getContactByNo(contactNo) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM contacts WHERE contact_no = ? LIMIT 1').get(contactNo);
    return this.mapContact(row);
  }

  nextContactNo(type, db = this.ensure()) {
    const prefix = prefixForType(type);
    const defaultStart = type === 'creditor' ? 20001 : 10001;
    const row = db
      .prepare(
        `SELECT MAX(CAST(substr(contact_no, 3) AS INTEGER)) AS max_number
         FROM contacts
         WHERE contact_no LIKE ?`
      )
      .get(`${prefix}-%`);

    const nextNumber = Math.max(defaultStart, Number(row?.max_number || 0) + 1);
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }

  buildNextcloudPath(type, contactNo, name) {
    const folder = basePathForType(type);
    const safeName = slugify(name) || contactNo.replace('-', '_');
    return `/ERP-Documents/${folder}/${contactNo}_${safeName}/`;
  }

  createContact(payload) {
    const db = this.ensure();
    const type = normalizeContactType(payload.type);

    if (!type) {
      const error = new Error('Contact type must be debtor or creditor');
      error.statusCode = 400;
      throw error;
    }

    const name = String(payload.name || payload.company_name || '').trim();
    if (!name) {
      const error = new Error('Contact name is required');
      error.statusCode = 400;
      throw error;
    }

    const contactNo = String(payload.contact_no || payload.contactNo || '').trim() || this.nextContactNo(type, db);
    const nextcloudPath = String(payload.nextcloud_path || payload.nextcloudPath || '').trim()
      || this.buildNextcloudPath(type, contactNo, name);

    try {
      const insert = db.prepare(
        `INSERT INTO contacts (
          contact_no, type, name, email, phone, address_json, payment_terms_json,
          accounting_json, tax_id, nextcloud_path, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      const info = insert.run(
        contactNo,
        type,
        name,
        payload.email || null,
        payload.phone || null,
        toJson(payload.address ?? payload.address_json ?? {}),
        toJson(payload.payment_terms ?? payload.payment_terms_json ?? {}),
        toJson(payload.accounting ?? payload.accounting_json ?? {}),
        payload.tax_id || payload.taxId || null,
        nextcloudPath
      );

      return this.getContactById(info.lastInsertRowid);
    } catch (error) {
      if (String(error.message || '').includes('UNIQUE')) {
        const conflict = new Error('Contact number already exists');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }

  updateContact(id, payload) {
    const db = this.ensure();
    const existing = this.getContactById(id);

    if (!existing) {
      return null;
    }

    const nextType = normalizeContactType(payload.type) || existing.type;
    if (payload.type !== undefined && !normalizeContactType(payload.type)) {
      const error = new Error('Contact type must be debtor or creditor');
      error.statusCode = 400;
      throw error;
    }

    const nextName = payload.name !== undefined
      ? String(payload.name || '').trim()
      : existing.name;

    if (payload.name !== undefined && !nextName) {
      const error = new Error('Contact name is required');
      error.statusCode = 400;
      throw error;
    }

    const nextContactNo = String(payload.contact_no || payload.contactNo || existing.contact_no).trim();
    const nextcloudPath = payload.nextcloud_path || payload.nextcloudPath || existing.nextcloud_path || this.buildNextcloudPath(nextType, nextContactNo, nextName);

    try {
      db.prepare(
        `UPDATE contacts SET
          contact_no = ?,
          type = ?,
          name = ?,
          email = ?,
          phone = ?,
          address_json = ?,
          payment_terms_json = ?,
          accounting_json = ?,
          tax_id = ?,
          nextcloud_path = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(
        nextContactNo,
        nextType,
        nextName,
        payload.email !== undefined ? payload.email || null : existing.email,
        payload.phone !== undefined ? payload.phone || null : existing.phone,
        payload.address !== undefined || payload.address_json !== undefined ? toJson(payload.address ?? payload.address_json ?? {}) : toJson(existing.address),
        payload.payment_terms !== undefined || payload.payment_terms_json !== undefined ? toJson(payload.payment_terms ?? payload.payment_terms_json ?? {}) : toJson(existing.payment_terms),
        payload.accounting !== undefined || payload.accounting_json !== undefined ? toJson(payload.accounting ?? payload.accounting_json ?? {}) : toJson(existing.accounting),
        payload.tax_id !== undefined || payload.taxId !== undefined ? (payload.tax_id || payload.taxId || null) : existing.tax_id,
        nextcloudPath,
        Number(id)
      );
    } catch (error) {
      if (String(error.message || '').includes('UNIQUE')) {
        const conflict = new Error('Contact number already exists');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }

    return this.getContactById(id);
  }
}

module.exports = ContactsRepository;

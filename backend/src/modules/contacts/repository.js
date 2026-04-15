const { openDatabase } = require('../../db/client');

class ContactsRepository {
  constructor(db = openDatabase()) {
    this.db = db;
  }

  listContacts(filters = {}) {
    let query = 'SELECT * FROM contacts WHERE is_active = 1';
    const params = [];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY name ASC';

    return this.db.prepare(query).all(...params);
  }

  getContactById(id) {
    return this.db
      .prepare('SELECT * FROM contacts WHERE id = ? AND is_active = 1')
      .get(id);
  }

  createContact(payload = {}) {
    const {
      contact_no,
      type,
      name,
      company,
      email,
      phone,
      address_json = '{}',
      payment_terms_json = '{}',
      accounting_json = '{}',
      tax_id,
      nextcloud_path,
      vat_number,
      vat_country
    } = payload;

    const stmt = this.db.prepare(`
      INSERT INTO contacts (
        contact_no, type, name, company, email, phone,
        address_json, payment_terms_json, accounting_json,
        tax_id, nextcloud_path, vat_number, vat_country,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      contact_no,
      type,
      name,
      company,
      email,
      phone,
      typeof address_json === 'string' ? address_json : JSON.stringify(address_json),
      typeof payment_terms_json === 'string' ? payment_terms_json : JSON.stringify(payment_terms_json),
      typeof accounting_json === 'string' ? accounting_json : JSON.stringify(accounting_json),
      tax_id,
      nextcloud_path,
      vat_number,
      vat_country
    );

    return this.getContactById(result.lastInsertRowid);
  }

  updateContact(id, payload = {}) {
    const contact = this.getContactById(id);
    if (!contact) {
      return null;
    }

    const updates = [];
    const params = [];

    // Map payload fields to database columns
    const fieldMap = {
      contact_no: 'contact_no',
      contactNo: 'contact_no',
      type: 'type',
      name: 'name',
      company: 'company',
      email: 'email',
      phone: 'phone',
      address_json: 'address_json',
      addressJson: 'address_json',
      payment_terms_json: 'payment_terms_json',
      paymentTermsJson: 'payment_terms_json',
      accounting_json: 'accounting_json',
      accountingJson: 'accounting_json',
      tax_id: 'tax_id',
      taxId: 'tax_id',
      nextcloud_path: 'nextcloud_path',
      nextcloudPath: 'nextcloud_path',
      vat_number: 'vat_number',
      vatNumber: 'vat_number',
      vat_country: 'vat_country',
      vatCountry: 'vat_country',
      vat_valid: 'vat_valid',
      vatValid: 'vat_valid',
      vat_validated_at: 'vat_validated_at',
      vatValidatedAt: 'vat_validated_at',
      vat_name: 'vat_name',
      vatName: 'vat_name',
      is_active: 'is_active',
      isActive: 'is_active'
    };

    for (const [key, value] of Object.entries(payload)) {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        // Handle JSON fields
        if (dbField.includes('_json') && typeof value !== 'string') {
          updates.push(`${dbField} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${dbField} = ?`);
          params.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return contact;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getContactById(id);
  }

  contactExists(id) {
    const contact = this.getContactById(id);
    return Boolean(contact);
  }
}

module.exports = ContactsRepository;
const { openDatabase } = require('../../db/client');

class SepaRepository {
  constructor(db = openDatabase()) {
    this.db = db;
  }

  // Get payments by IDs
  getPaymentsByIds(paymentIds) {
    if (!paymentIds || paymentIds.length === 0) {
      return [];
    }
    
    const placeholders = paymentIds.map(() => '?').join(',');
    const query = `
      SELECT p.*, c.name as recipient_name, c.iban as recipient_iban, c.bic as recipient_bic
      FROM payments p
      LEFT JOIN contacts c ON p.contact_id = c.id
      WHERE p.id IN (${placeholders})
        AND p.sepa_file_id IS NULL
        AND p.total_amount > 0
    `;
    
    return this.db.prepare(query).all(...paymentIds);
  }

  // Create SEPA file record
  createSepaFile(data) {
    const {
      file_name,
      xml_content,
      payment_count,
      total_amount,
      initiator_name,
      initiator_iban,
      initiator_bic,
      message_id,
      description,
      created_by_type,
      created_by_id,
      created_by_name,
      system_log_id,
      transaction_log_id
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO sepa_files (
        file_name, xml_content, payment_count, total_amount,
        initiator_name, initiator_iban, initiator_bic, message_id, description,
        created_by_type, created_by_id, created_by_name,
        system_log_id, transaction_log_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      file_name,
      xml_content,
      payment_count,
      total_amount,
      initiator_name,
      initiator_iban,
      initiator_bic,
      message_id,
      description || null,
      created_by_type,
      created_by_id,
      created_by_name,
      system_log_id || null,
      transaction_log_id || null
    );

    return result.lastInsertRowid;
  }

  // Link payments to SEPA file
  linkPaymentsToSepaFile(paymentIds, sepaFileId) {
    if (!paymentIds || paymentIds.length === 0) {
      return 0;
    }

    const placeholders = paymentIds.map(() => '?').join(',');
    const query = `
      UPDATE payments 
      SET sepa_file_id = ?, included_in_sepa_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;

    const stmt = this.db.prepare(query);
    return stmt.run(sepaFileId, ...paymentIds).changes;
  }

  // Get SEPA file by ID
  getSepaFile(id) {
    return this.db.prepare('SELECT * FROM sepa_files WHERE id = ?').get(id);
  }

  // List SEPA files
  listSepaFiles(filters = {}) {
    let query = 'SELECT * FROM sepa_files WHERE 1=1';
    const params = [];

    if (filters.from) {
      query += ' AND created_at >= ?';
      params.push(filters.from);
    }

    if (filters.to) {
      query += ' AND created_at <= ?';
      params.push(filters.to);
    }

    query += ' ORDER BY created_at DESC';
    
    return this.db.prepare(query).all(...params);
  }

  // Get payments for a SEPA file
  getPaymentsForSepaFile(sepaFileId) {
    return this.db.prepare(`
      SELECT p.*, c.name as recipient_name
      FROM payments p
      LEFT JOIN contacts c ON p.contact_id = c.id
      WHERE p.sepa_file_id = ?
      ORDER BY p.id
    `).all(sepaFileId);
  }

  // Update contact IBAN/BIC
  updateContactBankDetails(contactId, iban, bic) {
    const stmt = this.db.prepare(`
      UPDATE contacts 
      SET iban = ?, bic = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(iban || null, bic || null, contactId).changes > 0;
  }

  // Get contact by ID
  getContact(contactId) {
    return this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  }
}

module.exports = SepaRepository;
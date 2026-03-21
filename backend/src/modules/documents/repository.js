const { ensureDocumentsSchema } = require('./schema');

function parseJson(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class DocumentsRepository {
  ensure() {
    return ensureDocumentsSchema();
  }

  hasTable(name) {
    const db = this.ensure();
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(name);
    return Boolean(row);
  }

  contactExists(id) {
    if (!this.hasTable('contacts')) {
      return true;
    }

    const db = this.ensure();
    const row = db.prepare('SELECT id FROM contacts WHERE id = ? LIMIT 1').get(id);
    return Boolean(row);
  }

  getContact(id) {
    if (!this.hasTable('contacts')) {
      return null;
    }

    const db = this.ensure();
    return db.prepare('SELECT * FROM contacts WHERE id = ? LIMIT 1').get(id) || null;
  }

  createDocument(document) {
    const db = this.ensure();
    const stmt = db.prepare(`
      INSERT INTO documents (
        record_type, record_id, filename, mime_type, size_bytes,
        nextcloud_path, uploaded_by_type, uploaded_by_id, uploaded_by_name,
        metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const info = stmt.run(
      document.record_type,
      String(document.record_id),
      document.filename,
      document.mime_type || null,
      Number(document.size_bytes || 0),
      document.nextcloud_path,
      document.uploaded_by_type || null,
      document.uploaded_by_id || null,
      document.uploaded_by_name || null,
      JSON.stringify(document.metadata || {})
    );

    return this.getDocumentById(info.lastInsertRowid);
  }

  getDocumentById(id) {
    const db = this.ensure();
    const row = db.prepare('SELECT * FROM documents WHERE id = ? LIMIT 1').get(id);
    return row ? this.mapDocument(row) : null;
  }

  listDocuments(recordType, recordId) {
    const db = this.ensure();
    const rows = db.prepare(
      `SELECT * FROM documents
       WHERE record_type = ? AND record_id = ?
       ORDER BY id DESC`
    ).all(recordType, String(recordId));
    return rows.map((row) => this.mapDocument(row));
  }

  deleteDocument(id) {
    const db = this.ensure();
    const existing = this.getDocumentById(id);
    if (!existing) {
      return null;
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return existing;
  }

  mapDocument(row) {
    return {
      id: row.id,
      record_type: row.record_type,
      record_id: row.record_id,
      filename: row.filename,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      nextcloud_path: row.nextcloud_path,
      uploaded_by: {
        type: row.uploaded_by_type,
        id: row.uploaded_by_id,
        name: row.uploaded_by_name
      },
      metadata: parseJson(row.metadata_json, {}),
      created_at: row.created_at
    };
  }
}

module.exports = DocumentsRepository;

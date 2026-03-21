const DocumentsRepository = require('./repository');
const { NextcloudClient } = require('./nextcloud.client');
const { sanitizeFilename, sanitizeSegment } = require('./nextcloud.client');

function toBuffer(payload) {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (payload === null || payload === undefined) {
    return Buffer.alloc(0);
  }

  if (typeof payload === 'string') {
    return Buffer.from(payload, 'utf8');
  }

  return Buffer.from(JSON.stringify(payload), 'utf8');
}

class DocumentsService {
  constructor(options = {}) {
    this.repository = options.repository || new DocumentsRepository();
    this.nextcloud = options.nextcloudClient || new NextcloudClient(options.nextcloud);
  }

  normalizeRecordType(recordType) {
    const normalized = String(recordType || '').trim().toLowerCase();
    if (!normalized) {
      const error = new Error('record_type is required');
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }

  normalizeRecordId(recordId) {
    const normalized = String(recordId || '').trim();
    if (!normalized) {
      const error = new Error('record_id is required');
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }

  normalizeFilename(filename) {
    const normalized = String(filename || '').trim();
    if (!normalized) {
      const error = new Error('filename is required');
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }

  assertRecordExists(recordType, recordId) {
    if (recordType === 'contact' || recordType === 'contacts') {
      if (!this.repository.contactExists(recordId)) {
        const error = new Error('Contact not found');
        error.statusCode = 404;
        throw error;
      }
    }
  }

  async uploadDocument(payload, actor = null) {
    const recordType = this.normalizeRecordType(payload.record_type || payload.recordType || 'documents');
    const recordId = this.normalizeRecordId(payload.record_id || payload.recordId);
    const filename = this.normalizeFilename(payload.filename);

    this.assertRecordExists(recordType, recordId);

    const content = payload.content_base64
      ? Buffer.from(payload.content_base64, 'base64')
      : toBuffer(payload.content || payload.file || payload.body);

    const mimeType = payload.mime_type || payload.mimeType || 'application/octet-stream';
    const uploadResult = await this.nextcloud.upload({
      recordType,
      recordId,
      filename,
      content,
      mimeType
    });

    const document = this.repository.createDocument({
      record_type: recordType,
      record_id: recordId,
      filename,
      mime_type: mimeType,
      size_bytes: content.length,
      nextcloud_path: uploadResult.nextcloud_path,
      uploaded_by_type: actor?.authType || actor?.type || 'system',
      uploaded_by_id: actor?.id ? String(actor.id) : null,
      uploaded_by_name: actor?.name || actor?.username || 'system',
      metadata: {
        offline: uploadResult.mode === 'offline',
        remote_url: uploadResult.remote_url,
        source: payload.source || 'api',
        record_type: recordType,
        record_id: recordId
      }
    });

    return document;
  }

  listDocuments(recordType, recordId) {
    const normalizedType = this.normalizeRecordType(recordType);
    const normalizedId = this.normalizeRecordId(recordId);
    this.assertRecordExists(normalizedType, normalizedId);
    return this.repository.listDocuments(normalizedType, normalizedId);
  }

  async deleteDocument(id) {
    const deleted = this.repository.deleteDocument(id);
    if (!deleted) {
      const error = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    await this.nextcloud.remove(deleted.nextcloud_path);
    return deleted;
  }

  async uploadForContact(contactId, payload, actor = null) {
    return this.uploadDocument({
      ...payload,
      record_type: 'contacts',
      record_id: contactId,
      source: 'contacts'
    }, actor);
  }
}

module.exports = DocumentsService;

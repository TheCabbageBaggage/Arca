const ContactsRepository = require('./repository');
const { normalizeContactType } = require('./utils');

class ContactsService {
  constructor(repository = new ContactsRepository()) {
    this.repository = repository;
  }

  listContacts(filters = {}) {
    const type = filters.type ? normalizeContactType(filters.type) : null;
    if (filters.type && !type) {
      const error = new Error('Contact type must be debtor or creditor');
      error.statusCode = 400;
      throw error;
    }

    return this.repository.listContacts({ type });
  }

  getContact(id) {
    return this.repository.getContactById(id);
  }

  createContact(payload = {}) {
    return this.repository.createContact(payload);
  }

  updateContact(id, payload = {}) {
    return this.repository.updateContact(id, payload);
  }
}

module.exports = ContactsService;

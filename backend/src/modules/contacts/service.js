const ContactsRepository = require('./repository');
const { normalizeContactType } = require('./utils');
const { vatService } = require('../vat');

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

  async createContact(payload = {}) {
    const contact = await this.repository.createContact(payload);
    
    // Auto-validate VAT number if provided
    if (payload.vat_number || payload.vatNumber) {
      await this.validateVAT(contact.id);
    }
    
    return contact;
  }

  async updateContact(id, payload = {}) {
    const contact = await this.repository.updateContact(id, payload);
    
    // Auto-validate VAT number if provided or changed
    if (payload.vat_number || payload.vatNumber) {
      await this.validateVAT(id);
    }
    
    return contact;
  }

  /**
   * Validate VAT number for a contact
   * @param {number} contactId - Contact ID
   * @returns {Promise<Object>} Validation result
   */
  async validateVAT(contactId) {
    const contact = await this.repository.getContactById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const vatNumber = contact.vat_number;
    const vatCountry = contact.vat_country;
    
    if (!vatNumber || !vatCountry) {
      // No VAT number to validate
      return {
        valid: false,
        validated: false,
        error: 'No VAT number or country specified'
      };
    }

    let validationResult;
    
    // Check if it's an Austrian UID
    if (vatCountry.toUpperCase() === 'AT' && vatNumber.startsWith('U')) {
      const fullUID = `AT${vatNumber}`;
      validationResult = vatService.validateUID(fullUID);
    } else {
      // Use VIES API for other EU countries
      validationResult = await vatService.validateVAT(vatCountry, vatNumber);
    }

    // Update contact with validation result
    await this.repository.updateContact(contactId, {
      vat_valid: validationResult.valid ? 1 : 0,
      vat_validated_at: new Date().toISOString(),
      vat_name: validationResult.name || null
    });

    return {
      valid: validationResult.valid,
      validated: true,
      name: validationResult.name,
      address: validationResult.address,
      error: validationResult.error
    };
  }
}

module.exports = ContactsService;

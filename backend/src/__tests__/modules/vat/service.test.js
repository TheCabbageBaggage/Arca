const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const VATService = require('../../../modules/vat/service');

describe('VATService', () => {
  let vatService;

  beforeEach(() => {
    vatService = new VATService();
  });

  describe('validateUID', () => {
    it('should validate correct Austrian UID', () => {
      // Example valid Austrian UID: ATU12345678
      const result = vatService.validateUID('ATU12345678');
      
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.country, 'AT');
      assert.strictEqual(result.number, '12345678');
      assert.strictEqual(result.error, null);
    });

    it('should reject invalid Austrian UID format', () => {
      const result = vatService.validateUID('AT12345678');
      
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.country, 'AT');
      assert.strictEqual(result.error, 'Invalid format. Expected ATU followed by 8 digits (e.g., ATU12345678)');
    });

    it('should reject Austrian UID with wrong checksum', () => {
      // This should fail checksum validation
      const result = vatService.validateUID('ATU00000000');
      
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Checksum validation failed');
    });

    it('should handle null or empty UID', () => {
      const result1 = vatService.validateUID(null);
      const result2 = vatService.validateUID('');
      const result3 = vatService.validateUID(undefined);
      
      assert.strictEqual(result1.valid, false);
      assert.strictEqual(result2.valid, false);
      assert.strictEqual(result3.valid, false);
      assert.strictEqual(result1.error, 'UID must be a non-empty string');
    });
  });

  describe('parseVATId', () => {
    it('should parse Austrian UID correctly', () => {
      const result = vatService.parseVATId('ATU12345678');
      
      assert.strictEqual(result.countryCode, 'AT');
      assert.strictEqual(result.vatNumber, 'U12345678');
      assert.strictEqual(result.error, null);
    });

    it('should parse German VAT number correctly', () => {
      const result = vatService.parseVATId('DE123456789');
      
      assert.strictEqual(result.countryCode, 'DE');
      assert.strictEqual(result.vatNumber, '123456789');
      assert.strictEqual(result.error, null);
    });

    it('should parse VAT number with spaces', () => {
      const result = vatService.parseVATId('DE 123 456 789');
      
      assert.strictEqual(result.countryCode, 'DE');
      assert.strictEqual(result.vatNumber, '123456789');
      assert.strictEqual(result.error, null);
    });

    it('should handle lowercase input', () => {
      const result = vatService.parseVATId('de123456789');
      
      assert.strictEqual(result.countryCode, 'DE');
      assert.strictEqual(result.vatNumber, '123456789');
      assert.strictEqual(result.error, null);
    });

    it('should return error for unparseable VAT ID', () => {
      const result = vatService.parseVATId('123456789');
      
      assert.strictEqual(result.countryCode, null);
      assert.strictEqual(result.vatNumber, '123456789');
      assert.strictEqual(result.error, 'Could not parse VAT ID format');
    });
  });

  describe('_validateAustrianUIDChecksum', () => {
    it('should validate correct checksum', () => {
      // Example valid Austrian UID checksum
      const isValid = vatService._validateAustrianUIDChecksum('12345678');
      
      assert.strictEqual(isValid, true);
    });

    it('should reject invalid checksum', () => {
      const isValid = vatService._validateAustrianUIDChecksum('00000000');
      
      assert.strictEqual(isValid, false);
    });

    it('should reject wrong length', () => {
      const isValid1 = vatService._validateAustrianUIDChecksum('1234567');
      const isValid2 = vatService._validateAustrianUIDChecksum('123456789');
      
      assert.strictEqual(isValid1, false);
      assert.strictEqual(isValid2, false);
    });
  });
});

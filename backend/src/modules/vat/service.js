const https = require('https');

/**
 * Austrian UID (VAT number) validation
 * Format: ATU + 8 digits (e.g., ATU12345678)
 * Checksum validation according to Austrian UID algorithm
 */
class VATService {
  constructor() {
    this.viesEndpoint = 'https://ec.europa.eu/taxation_customs/vies/rest-api/checkVAT';
  }

  /**
   * Validate Austrian UID (VAT number)
   * @param {string} uid - UID to validate (e.g., 'ATU12345678')
   * @returns {Object} Validation result
   */
  validateUID(uid) {
    if (!uid || typeof uid !== 'string') {
      return {
        valid: false,
        country: null,
        number: null,
        error: 'UID must be a non-empty string'
      };
    }

    // Normalize: remove spaces, convert to uppercase
    const normalized = uid.replace(/\s+/g, '').toUpperCase();
    
    // Check format: AT + 8 digits
    const uidRegex = /^ATU(\d{8})$/;
    const match = normalized.match(uidRegex);
    
    if (!match) {
      return {
        valid: false,
        country: 'AT',
        number: normalized,
        error: 'Invalid format. Expected ATU followed by 8 digits (e.g., ATU12345678)'
      };
    }

    const digits = match[1];
    
    // Austrian UID checksum validation
    const isValid = this._validateAustrianUIDChecksum(digits);
    
    return {
      valid: isValid,
      country: 'AT',
      number: digits,
      error: isValid ? null : 'Checksum validation failed'
    };
  }

  /**
   * Austrian UID checksum validation algorithm
   * @param {string} digits - 8-digit number
   * @returns {boolean}
   */
  _validateAustrianUIDChecksum(digits) {
    if (digits.length !== 8) return false;
    
    // Convert to array of numbers
    const numbers = digits.split('').map(Number);
    
    // Weight factors for Austrian UID
    const weights = [1, 2, 1, 2, 1, 2, 1, 2];
    
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      let product = numbers[i] * weights[i];
      
      // If product is two-digit, sum the digits
      if (product >= 10) {
        product = Math.floor(product / 10) + (product % 10);
      }
      
      sum += product;
    }
    
    // Valid if sum is divisible by 10
    return sum % 10 === 0;
  }

  /**
   * Validate any EU VAT number using VIES API
   * @param {string} countryCode - 2-letter country code (e.g., 'DE', 'IT', 'FR')
   * @param {string} vatNumber - VAT number without country code
   * @returns {Promise<Object>} Validation result
   */
  async validateVAT(countryCode, vatNumber) {
    if (!countryCode || !vatNumber) {
      return {
        valid: false,
        name: null,
        address: null,
        country: countryCode,
        error: 'Country code and VAT number are required'
      };
    }

    // Normalize inputs
    const normalizedCountry = countryCode.toUpperCase().replace(/\s+/g, '');
    const normalizedVAT = vatNumber.replace(/\s+/g, '');

    try {
      const result = await this._callVIESAPI(normalizedCountry, normalizedVAT);
      return result;
    } catch (error) {
      // Graceful fallback: log warning but allow the number
      console.warn(`VIES API unavailable: ${error.message}. Allowing VAT number without validation.`);
      
      return {
        valid: true, // Assume valid when VIES is unavailable
        name: null,
        address: null,
        country: normalizedCountry,
        error: 'VIES service unavailable, validation skipped'
      };
    }
  }

  /**
   * Call VIES REST API
   * @param {string} countryCode - 2-letter country code
   * @param {string} vatNumber - VAT number
   * @returns {Promise<Object>}
   */
  _callVIESAPI(countryCode, vatNumber) {
    return new Promise((resolve, reject) => {
      const url = `${this.viesEndpoint}?countryCode=${encodeURIComponent(countryCode)}&vatNumber=${encodeURIComponent(vatNumber)}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (result.error) {
              resolve({
                valid: false,
                name: null,
                address: null,
                country: countryCode,
                error: result.error
              });
            } else {
              resolve({
                valid: result.valid,
                name: result.name || null,
                address: result.address || null,
                country: countryCode,
                error: null
              });
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse VIES response: ${parseError.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`VIES API request failed: ${error.message}`));
      });
    });
  }

  /**
   * Extract country code and VAT number from a full VAT ID string
   * @param {string} vatId - Full VAT ID (e.g., 'DE123456789', 'ATU12345678')
   * @returns {Object} Parsed components
   */
  parseVATId(vatId) {
    if (!vatId || typeof vatId !== 'string') {
      return { countryCode: null, vatNumber: null, error: 'Invalid VAT ID' };
    }

    const normalized = vatId.replace(/\s+/g, '').toUpperCase();
    
    // Check for Austrian UID format
    if (normalized.startsWith('ATU') && normalized.length === 11) {
      return {
        countryCode: 'AT',
        vatNumber: normalized.substring(2), // Remove 'AT' prefix
        error: null
      };
    }
    
    // Generic EU VAT format: 2-letter country code + numbers
    const match = normalized.match(/^([A-Z]{2})(.+)$/);
    
    if (match) {
      return {
        countryCode: match[1],
        vatNumber: match[2],
        error: null
      };
    }
    
    return {
      countryCode: null,
      vatNumber: normalized,
      error: 'Could not parse VAT ID format'
    };
  }

  /**
   * Validate a full VAT ID (auto-detects country)
   * @param {string} vatId - Full VAT ID
   * @returns {Promise<Object>} Validation result
   */
  async validateVATId(vatId) {
    const parsed = this.parseVATId(vatId);
    
    if (parsed.error) {
      return {
        valid: false,
        country: null,
        number: null,
        name: null,
        address: null,
        error: parsed.error
      };
    }

    // Special handling for Austrian UID
    if (parsed.countryCode === 'AT') {
      const uidResult = this.validateUID(vatId);
      
      if (!uidResult.valid) {
        return {
          ...uidResult,
          name: null,
          address: null
        };
      }
      
      // Also check with VIES for Austrian numbers
      try {
        const viesResult = await this.validateVAT('AT', parsed.vatNumber);
        return {
          valid: viesResult.valid,
          country: 'AT',
          number: uidResult.number,
          name: viesResult.name,
          address: viesResult.address,
          error: viesResult.error
        };
      } catch (error) {
        // Fall back to local validation if VIES fails
        return {
          valid: uidResult.valid,
          country: 'AT',
          number: uidResult.number,
          name: null,
          address: null,
          error: 'VIES validation failed, using local checksum validation only'
        };
      }
    }
    
    // For other EU countries, use VIES
    return this.validateVAT(parsed.countryCode, parsed.vatNumber);
  }
}

module.exports = VATService;

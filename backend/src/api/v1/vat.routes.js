console.log('VAT routes loading...');

const express = require('express');
const router = express.Router();
const { vatService } = require('../../modules/vat');
const ContactsService = require('../../modules/contacts/service');
const ContactsRepository = require('../../modules/contacts/repository');

const contactsService = new ContactsService(new ContactsRepository());

console.log('VAT validate route registered');

/**
 * @route GET /api/v1/fx/vat-validate
 * @desc Validate a VAT number
 * @access Public (consider adding auth if needed)
 */
router.get('/vat-validate', async (req, res) => {
  console.log('VAT validate endpoint called - handler executing');
  try {
    const { country, vatNumber } = req.query;
    
    if (!country || !vatNumber) {
      return res.status(400).json({
        error: 'Missing required parameters: country and vatNumber'
      });
    }

    console.log('Calling vatService.validateVAT with:', country, vatNumber);
    const result = await vatService.validateVAT(country, vatNumber);
    
    res.json(result);
  } catch (error) {
    console.error('VAT validation error:', error);
    res.status(500).json({
      error: 'Failed to validate VAT number',
      details: error.message
    });
  }
});

/**
 * @route POST /api/v1/contacts/:id/validate-vat
 * @desc Validate VAT number for a contact
 * @access Private
 */
router.post('/contacts/:id/validate-vat', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    
    if (isNaN(contactId) || contactId <= 0) {
      return res.status(400).json({
        error: 'Invalid contact ID'
      });
    }

    const result = await contactsService.validateVAT(contactId);
    
    res.json(result);
  } catch (error) {
    console.error('Contact VAT validation error:', error);
    
    if (error.message === 'Contact not found') {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }
    
    res.status(500).json({
      error: 'Failed to validate contact VAT number',
      details: error.message
    });
  }
});

/**
 * @route PATCH /api/v1/invoices/:id
 * @desc Update invoice (specifically for reverse_charge field)
 * @access Private
 */
router.patch('/invoices/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    
    if (isNaN(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        error: 'Invalid invoice ID'
      });
    }

    // Check if only allowed fields are being updated
    const allowedFields = ['reverse_charge', 'reverseCharge', 'vat_rate', 'vatRate'];
    const updatePayload = {};
    
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        const dbField = key === 'reverseCharge' ? 'reverse_charge' : 
                       key === 'vatRate' ? 'vat_rate' : key;
        updatePayload[dbField] = value;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update. Allowed fields: reverse_charge, vat_rate'
      });
    }

    // Import finance service dynamically to avoid circular dependencies
    const FinanceService = require('../../modules/finance/service');
    const FinanceRepository = require('../../modules/finance/repository');
    const financeService = new FinanceService(new FinanceRepository());
    
    const updatedInvoice = financeService.updateInvoice(invoiceId, updatePayload, req.actor);
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Invoice update error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }
    
    res.status(500).json({
      error: 'Failed to update invoice',
      details: error.message
    });
  }
});

module.exports = router;

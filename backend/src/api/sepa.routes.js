const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { sepaService } = require('../modules/sepa');
const { publishEvent } = require('../realtime/bus');

const router = express.Router();

// Helper function to get actor from request
function actorFromRequest(req) {
  const user = req.user || req.auth?.user || null;
  return {
    id: user?.id ? String(user.id) : null,
    name: user?.name || user?.username || null,
    username: user?.username || user?.name || null,
    keyId: user?.keyId || null,
    authType: user?.authType || null,
    type: user?.authType || user?.type || null
  };
}

// Validate IBAN
router.get('/validate-iban', authenticate, requireScopes(['finance:read']), async (req, res, next) => {
  try {
    const { iban } = req.query;
    if (!iban) {
      return res.status(400).json({ error: 'IBAN parameter is required' });
    }

    const validation = sepaService.validateIBAN(iban);
    res.status(200).json(validation);
  } catch (error) {
    next(error);
  }
});

// Validate BIC
router.get('/validate-bic', authenticate, requireScopes(['finance:read']), async (req, res, next) => {
  try {
    const { bic } = req.query;
    if (!bic) {
      return res.status(400).json({ error: 'BIC parameter is required' });
    }

    const validation = sepaService.validateBIC(bic);
    res.status(200).json(validation);
  } catch (error) {
    next(error);
  }
});

// Generate SEPA file from payment IDs
router.post('/generate', authenticate, requireScopes(['finance:write']), async (req, res, next) => {
  try {
    const { paymentIds, description, initiatorName, initiatorIban, initiatorBic } = req.body;
    
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: 'paymentIds array with at least one ID is required' });
    }

    const actor = actorFromRequest(req);
    const options = {
      description,
      initiatorName,
      initiatorIban,
      initiatorBic
    };

    const result = sepaService.createSEPAFile(paymentIds, actor, options);
    
    // Publish event
    publishEvent('finance.sepa.created', {
      fileId: result.fileId,
      fileName: result.fileName,
      paymentCount: result.paymentCount,
      amount: result.amount,
      actor: actor.name || actor.id
    });

    res.status(201).json({
      fileId: result.fileId,
      fileName: result.fileName,
      amount: result.amount,
      paymentCount: result.paymentCount,
      linkedCount: result.linkedCount,
      validationErrors: result.validationErrors || []
    });
  } catch (error) {
    next(error);
  }
});

// Download SEPA file
router.get('/download/:fileId', authenticate, requireScopes(['finance:read']), async (req, res, next) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    if (!fileId || fileId <= 0) {
      return res.status(400).json({ error: 'Valid file ID is required' });
    }

    const sepaFile = sepaService.getSepaFile(fileId);
    if (!sepaFile) {
      return res.status(404).json({ error: 'SEPA file not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${sepaFile.file_name}"`);
    
    res.send(sepaFile.xml_content);
  } catch (error) {
    next(error);
  }
});

// List SEPA files
router.get('/', authenticate, requireScopes(['finance:read']), async (req, res, next) => {
  try {
    const filters = {
      from: req.query.from,
      to: req.query.to
    };

    const sepaFiles = sepaService.listSepaFiles(filters);
    res.status(200).json({ sepaFiles });
  } catch (error) {
    next(error);
  }
});

// Get SEPA file details
router.get('/:fileId', authenticate, requireScopes(['finance:read']), async (req, res, next) => {
  try {
    const fileId = parseInt(req.params.fileId, 10);
    if (!fileId || fileId <= 0) {
      return res.status(400).json({ error: 'Valid file ID is required' });
    }

    const sepaFile = sepaService.getSepaFile(fileId);
    if (!sepaFile) {
      return res.status(404).json({ error: 'SEPA file not found' });
    }

    res.status(200).json({ sepaFile });
  } catch (error) {
    next(error);
  }
});

// Update contact bank details
router.put('/contacts/:contactId/bank-details', authenticate, requireScopes(['contacts:write']), async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.contactId, 10);
    if (!contactId || contactId <= 0) {
      return res.status(400).json({ error: 'Valid contact ID is required' });
    }

    const { iban, bic } = req.body;
    if (!iban && !bic) {
      return res.status(400).json({ error: 'At least one of IBAN or BIC is required' });
    }

    const actor = actorFromRequest(req);
    const result = sepaService.updateContactBankDetails(contactId, iban, bic, actor);

    // Publish event
    publishEvent('contacts.bank_details.updated', {
      contactId,
      hasIban: !!iban,
      hasBic: !!bic,
      actor: actor.name || actor.id
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
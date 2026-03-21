const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { contactsService } = require('../modules/contacts');
const { documentsService } = require('../modules/documents');

const router = express.Router();

function parseId(id) {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function listContacts(req, res, next) {
  try {
    const contacts = contactsService.listContacts({ type: req.query.type });
    res.status(200).json({ contacts });
  } catch (error) {
    next(error);
  }
}

async function createContact(req, res, next) {
  try {
    const contact = contactsService.createContact(req.body || {});
    res.status(201).json({ contact });
  } catch (error) {
    next(error);
  }
}

async function getContact(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const contact = contactsService.getContact(id);
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ contact });
  } catch (error) {
    next(error);
  }
}

async function updateContact(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const contact = contactsService.updateContact(id, req.body || {});
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ contact });
  } catch (error) {
    next(error);
  }
}

async function uploadContactDocument(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const actor = req.user || req.auth?.user || null;
    const document = await documentsService.uploadForContact(id, req.body || {}, actor);
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

router.get('/', authenticate, requireScopes('contacts:read'), listContacts);
router.post('/', authenticate, requireScopes('contacts:write'), createContact);
router.get('/:id', authenticate, requireScopes('contacts:read'), getContact);
router.put('/:id', authenticate, requireScopes('contacts:write'), updateContact);
router.post('/:id/documents', authenticate, requireScopes('documents:write'), uploadContactDocument);

router.handlers = {
  listContacts,
  createContact,
  getContact,
  updateContact,
  uploadContactDocument
};

module.exports = router;

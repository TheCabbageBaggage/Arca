const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { documentsService } = require('../modules/documents');

const router = express.Router();

function getActor(req) {
  return req.user || req.auth?.user || null;
}

async function uploadDocument(req, res, next) {
  try {
    const document = await documentsService.uploadDocument(req.body || {}, getActor(req));
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

async function listDocuments(req, res, next) {
  try {
    const documents = documentsService.listDocuments(req.params.type, req.params.id);
    res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const document = await documentsService.deleteDocument(req.params.id);
    res.status(200).json({ deleted: true, document });
  } catch (error) {
    next(error);
  }
}

router.post('/upload', authenticate, requireScopes('documents:write'), uploadDocument);
router.get('/:type/:id', authenticate, requireScopes('documents:read'), listDocuments);
router.delete('/:id', authenticate, requireScopes('documents:write'), deleteDocument);

router.handlers = {
  uploadDocument,
  listDocuments,
  deleteDocument
};

module.exports = router;

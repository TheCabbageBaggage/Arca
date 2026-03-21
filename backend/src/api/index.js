const express = require('express');
const authRoutes = require('./auth.routes');
const agentsRoutes = require('./agents.routes');
const llmRoutes = require('./llm.routes');
const contactsRoutes = require('./contacts.routes');
const documentsRoutes = require('./documents.routes');
const financeRoutes = require('./finance.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/llm', llmRoutes);
router.use('/contacts', contactsRoutes);
router.use('/documents', documentsRoutes);
router.use('/', financeRoutes);

module.exports = router;

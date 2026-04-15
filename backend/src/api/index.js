const express = require('express');
const authRoutes = require('./auth.routes');
const agentsRoutes = require('./agents.routes');
const llmRoutes = require('./llm.routes');
const contactsRoutes = require('./contacts.routes');
const documentsRoutes = require('./documents.routes');
const financeRoutes = require('./finance.routes');
const projectsRoutes = require('./projects.routes');
const tokensRoutes = require('./tokens.routes');
const dashboardRoutes = require('./dashboard.routes');
const inventoryRoutes = require('./inventory.routes');
const reportsRoutes = require('./reports.routes');
const fxRoutes = require('./fx.routes');
const approvalsRoutes = require('./approvals.routes');
const sepaRoutes = require('./sepa.routes');
const vatRoutes = require('./v1/vat.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/llm', llmRoutes);
router.use('/contacts', contactsRoutes);
router.use('/documents', documentsRoutes);
router.use('/payments/sepa', sepaRoutes);
router.use('/', vatRoutes);  // CHANGED FROM '/api/v1' to '/'
router.use('/', financeRoutes);
router.use('/', projectsRoutes);
router.use('/', tokensRoutes);
router.use('/', dashboardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/', reportsRoutes);
router.use('/', fxRoutes);
router.use('/', approvalsRoutes);

module.exports = router;

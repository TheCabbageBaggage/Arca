const express = require('express');
const authRoutes = require('./auth.routes');
const agentsRoutes = require('./agents.routes');
const llmRoutes = require('./llm.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/llm', llmRoutes);

module.exports = router;

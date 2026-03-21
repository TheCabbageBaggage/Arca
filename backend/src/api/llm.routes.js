const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { agentTaskService } = require('../modules/agents');

const router = express.Router();

async function listProviders(req, res, next) {
  try {
    res.status(200).json({ providers: agentTaskService.listProviders() });
  } catch (error) {
    next(error);
  }
}

async function updateRoutingRules(req, res, next) {
  try {
    const payload = req.body || {};
    if (!payload.condition_field || !payload.condition_op || !payload.condition_value || !payload.provider_name) {
      const error = new Error('Incomplete routing rule');
      error.statusCode = 400;
      throw error;
    }

    const rule = agentTaskService.createRoutingRule(payload);
    res.status(201).json({ rule });
  } catch (error) {
    next(error);
  }
}

async function testProvider(req, res, next) {
  try {
    const result = await agentTaskService.testProvider(req.params.provider, req.body || {});
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

router.get('/providers', authenticate, requireScopes('llm:read'), listProviders);
router.post('/routing-rules', authenticate, requireScopes('llm:write'), updateRoutingRules);
router.post('/test/:provider', authenticate, requireScopes('llm:write'), testProvider);

router.handlers = {
  listProviders,
  updateRoutingRules,
  testProvider
};

module.exports = router;

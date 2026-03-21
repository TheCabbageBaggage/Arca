const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { tokensService } = require('../modules/tokens');

const router = express.Router();

async function listTokenUsage(req, res, next) {
  try {
    const usage = tokensService.getUsage({
      provider: req.query.provider,
      from: req.query.from,
      to: req.query.to,
      project_id: req.query.project_id
    });

    res.status(200).json({ usage });
  } catch (error) {
    next(error);
  }
}

async function getSprintTokenBudget(req, res, next) {
  try {
    const budget = tokensService.getBudget(req.params.sprintId);
    res.status(200).json({ budget });
  } catch (error) {
    next(error);
  }
}

async function getTokenCostForecast(req, res, next) {
  try {
    const forecast = tokensService.getCostForecast(req.query || {});
    res.status(200).json({ forecast });
  } catch (error) {
    next(error);
  }
}

router.get('/tokens/usage', authenticate, requireScopes('tokens:read'), listTokenUsage);
router.get('/tokens/budget/:sprintId', authenticate, requireScopes('tokens:read'), getSprintTokenBudget);
router.get('/tokens/cost-forecast', authenticate, requireScopes('tokens:read'), getTokenCostForecast);

router.handlers = {
  listTokenUsage,
  getSprintTokenBudget,
  getTokenCostForecast
};

module.exports = router;

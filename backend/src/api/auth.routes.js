const express = require('express');
const AuthService = require('../modules/auth/auth.service');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const authService = new AuthService();

router.post('/login', (req, res, next) => {
  try {
    const { identifier, username, email, password } = req.body || {};
    const result = authService.login(identifier || username || email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/agent-keys', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const result = authService.createAgentKey(req.user, req.body || {});
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require("express");
const { authenticate, requireScopes } = require("../middleware/auth");
const { approvalsService } = require("../modules/approvals");

const router = express.Router();

router.post("/approvals/policies", authenticate, requireScopes("approvals:write"), (req, res, next) => {
  try {
    const policy = approvalsService.createPolicy(req.body || {});
    res.status(201).json({ policy });
  } catch (error) {
    next(error);
  }
});

router.get("/approvals/policies", authenticate, requireScopes("approvals:read"), (_req, res, next) => {
  try {
    res.status(200).json({ policies: approvalsService.listPolicies() });
  } catch (error) {
    next(error);
  }
});

router.patch("/approvals/policies/:id", authenticate, requireScopes("approvals:write"), (req, res, next) => {
  try {
    const policy = approvalsService.updatePolicy(req.params.id, req.body || {});
    res.status(200).json({ policy });
  } catch (error) {
    next(error);
  }
});

router.get("/approvals/requests", authenticate, requireScopes("approvals:read"), (req, res, next) => {
  try {
    res.status(200).json({ requests: approvalsService.listRequests(req.query || {}) });
  } catch (error) {
    next(error);
  }
});

router.post("/approvals/requests/:id/approve", authenticate, requireScopes("approvals:approve"), (req, res, next) => {
  try {
    const request = approvalsService.approve(req.params.id, req.user || req.auth?.user || null, req.body?.reason);
    res.status(200).json({ request });
  } catch (error) {
    next(error);
  }
});

router.post("/approvals/requests/:id/reject", authenticate, requireScopes("approvals:approve"), (req, res, next) => {
  try {
    const request = approvalsService.reject(req.params.id, req.user || req.auth?.user || null, req.body?.reason);
    res.status(200).json({ request });
  } catch (error) {
    next(error);
  }
});

router.get("/approvals/requests/:id/audit", authenticate, requireScopes("approvals:read"), (req, res, next) => {
  try {
    const audit = approvalsService.getAudit(req.params.id);
    res.status(200).json({ audit });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { reportsService } = require('../modules/reports');

const router = express.Router();

async function cashFlow(req, res, next) {
  try { res.status(200).json(reportsService.cashFlow(req.query || {})); } catch (error) { next(error); }
}

async function budgetVsActual(req, res, next) {
  try { res.status(200).json(reportsService.budgetVsActual(req.query || {})); } catch (error) { next(error); }
}

async function arAging(req, res, next) {
  try { res.status(200).json(reportsService.arAging(req.query || {})); } catch (error) { next(error); }
}

async function apAging(req, res, next) {
  try { res.status(200).json(reportsService.apAging(req.query || {})); } catch (error) { next(error); }
}

async function exportReport(req, res, next) {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const reportId = req.params.report_id;
    const exported = reportsService.exportReport(reportId, format, req.query || {}, req.user || req.auth?.user || null);
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.status(200).send(exported.body);
  } catch (error) {
    next(error);
  }
}

router.get('/reports/cash-flow', authenticate, requireScopes('reports:read'), cashFlow);
router.get('/reports/budget-vs-actual', authenticate, requireScopes('reports:read'), budgetVsActual);
router.get('/reports/ar-aging', authenticate, requireScopes('reports:read'), arAging);
router.get('/reports/ap-aging', authenticate, requireScopes('reports:read'), apAging);
router.get('/reports/:report_id/export', authenticate, requireScopes('reports:read'), exportReport);

module.exports = router;

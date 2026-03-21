const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { financeService } = require('../modules/finance');

const router = express.Router();

function ensureId(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${label} not found`);
    error.statusCode = 404;
    throw error;
  }
  return parsed;
}

async function listInvoices(req, res, next) {
  try {
    const invoices = financeService.listInvoices({
      contact_id: req.query.contact_id,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to
    });
    res.status(200).json({ invoices });
  } catch (error) {
    next(error);
  }
}

async function createInvoice(req, res, next) {
  try {
    const invoice = financeService.createInvoice(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ invoice });
  } catch (error) {
    next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const payment = financeService.createPayment(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
}

async function createJournalEntry(req, res, next) {
  try {
    const journalEntry = financeService.createJournalEntry(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ journal_entry: journalEntry });
  } catch (error) {
    next(error);
  }
}

async function reportPl(req, res, next) {
  try {
    const report = financeService.reportPl(req.query || {});
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
}

async function reportVat(req, res, next) {
  try {
    const report = financeService.reportVat(req.query || {});
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
}

async function reportOpenAr(req, res, next) {
  try {
    const report = financeService.reportOpenAr(req.query || {});
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
}

router.get('/invoices', authenticate, requireScopes('finance:read'), listInvoices);
router.post('/invoices', authenticate, requireScopes('finance:write'), createInvoice);
router.post('/payments', authenticate, requireScopes('finance:write'), createPayment);
router.post('/journal-entries', authenticate, requireScopes('finance:write'), createJournalEntry);
router.get('/reports/pl', authenticate, requireScopes('finance:read'), reportPl);
router.get('/reports/vat', authenticate, requireScopes('finance:read'), reportVat);
router.get('/reports/open-ar', authenticate, requireScopes('finance:read'), reportOpenAr);

router.handlers = {
  listInvoices,
  createInvoice,
  createPayment,
  createJournalEntry,
  reportPl,
  reportVat,
  reportOpenAr
};

module.exports = router;

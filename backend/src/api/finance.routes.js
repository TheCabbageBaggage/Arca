const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { financeService } = require('../modules/finance');
const { agentTaskService } = require('../modules/agents');
const { publishEvent } = require('../realtime/bus');

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

function buildApprovalInstruction(operation, payload = {}) {
  const description = payload.description ? ` (${payload.description})` : '';
  return `Approval required for ${operation}${description}`;
}

function actorFromUser(user) {
  return {
    id: user?.id ? String(user.id) : null,
    name: user?.name || user?.username || null,
    username: user?.username || user?.name || null,
    keyId: user?.keyId || null,
    authType: user?.authType || null
  };
}

function maybeQueueApprovalTask(req, res, error, operation) {
  if (error?.code !== 'SPEND_APPROVAL_REQUIRED') {
    return false;
  }

  const actor = actorFromUser(req.user || req.auth?.user || null);
  const approval = error.approval || {};
  const task = agentTaskService.createTask({
    task_type: 'finance_approval',
    instruction: buildApprovalInstruction(operation, req.body || {}),
    approval_required: true,
    approval_scope: approval.scope || 'finance:write',
    approval_amount_usd: approval.amount_usd || 0,
    approval_reason: error.message,
    context: {
      spend_approval: approval,
      pending_action: {
        module: 'finance',
        action: operation,
        payload: req.body || {}
      },
      actor
    }
  }, actor);

  res.status(202).json({
    task_id: task.task_id,
    status: task.status,
    task_type: task.task_type,
    approval
  });

  publishEvent('finance.approval.required', {
    operation,
    task_id: task.task_id,
    status: task.status,
    approval
  });

  return true;
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
    publishEvent('finance.invoice.created', {
      invoice_id: invoice.id,
      invoice_no: invoice.invoice_no,
      total_gross: invoice.total_gross,
      status: invoice.status
    });
  } catch (error) {
    if (maybeQueueApprovalTask(req, res, error, 'create_invoice')) {
      return;
    }
    next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const payment = financeService.createPayment(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ payment });
    publishEvent('finance.payment.created', {
      payment_id: payment.id,
      payment_no: payment.payment_no,
      total_amount: payment.total_amount
    });
  } catch (error) {
    if (maybeQueueApprovalTask(req, res, error, 'create_payment')) {
      return;
    }
    next(error);
  }
}

async function createJournalEntry(req, res, next) {
  try {
    const journalEntry = financeService.createJournalEntry(req.body || {}, req.user || req.auth?.user || null);
    res.status(201).json({ journal_entry: journalEntry });
    publishEvent('finance.journal_entry.created', {
      journal_entry_id: journalEntry.id,
      entry_no: journalEntry.entry_no,
      total_debit: journalEntry.total_debit,
      total_credit: journalEntry.total_credit
    });
  } catch (error) {
    if (maybeQueueApprovalTask(req, res, error, 'create_journal_entry')) {
      return;
    }
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

const FinanceRepository = require('./repository');
const { normalizeDate, normalizePeriod, periodFromDate, toNumber } = require('./utils');

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === '') {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

function actorOrSystem(actor) {
  return {
    type: actor?.authType || actor?.type || 'system',
    id: actor?.id ? String(actor.id) : 'system',
    name: actor?.name || actor?.username || 'system'
  };
}

class FinanceService {
  constructor(repository = new FinanceRepository()) {
    this.repository = repository;
  }

  enforceSpendApproval(scope, amountUsd, actor, operation) {
    if (actor?.approvalGranted === true) {
      return;
    }

    const isAgentKey = Boolean(actor?.keyId || actor?.authType === 'agent_key' || actor?.type === 'agent_key');
    if (!isAgentKey) {
      return;
    }

    const amount = toNumber(amountUsd, 0);
    const rule = this.repository.getApplicableSpendApprovalRule(scope, amount);
    if (!rule) {
      return;
    }

    const autoApprove = rule.auto_approve_usd;
    if (autoApprove !== null && amount <= autoApprove) {
      return;
    }

    const error = new Error('Spend approval required before posting this booking');
    error.statusCode = 409;
    error.code = 'SPEND_APPROVAL_REQUIRED';
    error.approval = {
      operation,
      scope,
      amount_usd: amount,
      rule_id: rule.id,
      approver_key_id: rule.approver_key_id,
      notify_human: rule.notify_human_usd !== null ? amount >= rule.notify_human_usd : false
    };
    throw error;
  }

  listInvoices(filters = {}) {
    return this.repository.listInvoices(filters);
  }

  createInvoice(payload = {}, actor = null) {
    requireField(payload.contact_id || payload.contactId, 'contact_id is required');
    const contactId = Number(payload.contact_id || payload.contactId);
    if (!this.repository.contactExists(contactId)) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const issueDate = normalizeDate(payload.issue_date || payload.issueDate || new Date().toISOString());
    const bookingPeriod = normalizePeriod(payload.booking_period || payload.bookingPeriod) || periodFromDate(issueDate);
    const subtotalNet = toNumber(payload.subtotal_net ?? payload.subtotalNet, 0);
    const taxRate = toNumber(payload.tax_rate ?? payload.taxRate, 0);
    const taxAmount = toNumber(payload.tax_amount ?? payload.taxAmount, subtotalNet * (taxRate / 100));
    const totalGross = toNumber(payload.total_gross ?? payload.totalGross, subtotalNet + taxAmount);
    const paidAmount = toNumber(payload.paid_amount ?? payload.paidAmount, 0);
    const balanceAmount = Math.max(0, totalGross - paidAmount);
    const createdBy = actorOrSystem(actor);
    const dueDate = payload.due_date || payload.dueDate || null;
    const normalizedDueDate = dueDate ? normalizeDate(dueDate) : null;

    if (dueDate && !normalizedDueDate) {
      const error = new Error('due_date is invalid');
      error.statusCode = 400;
      throw error;
    }

    if (normalizedDueDate && normalizedDueDate < issueDate) {
      const error = new Error('due_date cannot be before issue_date');
      error.statusCode = 400;
      throw error;
    }

    this.enforceSpendApproval('finance:write', totalGross, actor, 'create_invoice');

    return this.repository.createInvoice({
      invoice_no: payload.invoice_no || payload.invoiceNo,
      invoice_type: payload.invoice_type || payload.invoiceType || 'invoice',
      contact_id: contactId,
      issue_date: issueDate,
      due_date: normalizedDueDate,
      booking_period: bookingPeriod,
      status: payload.status || 'issued',
      currency: payload.currency || 'EUR',
      subtotal_net: subtotalNet,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_gross: totalGross,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      description: payload.description || null,
      lines: Array.isArray(payload.lines) ? payload.lines : [],
      nextcloud_path: payload.nextcloud_path || payload.nextcloudPath || null,
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name,
      fx_rate: toNumber(payload.fx_rate ?? payload.fxRate, 1),
      amount_base_currency: toNumber(payload.amount_base_currency ?? payload.amountBaseCurrency, totalGross)
    });
  }

  createPayment(payload = {}, actor = null) {
    requireField(payload.contact_id || payload.contactId, 'contact_id is required');
    requireField(payload.amount_gross || payload.total_amount || payload.amount, 'amount is required');
    const contactId = Number(payload.contact_id || payload.contactId);
    if (!this.repository.contactExists(contactId)) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const invoiceId = payload.invoice_id || payload.invoiceId || null;
    if (invoiceId && !this.repository.getInvoiceById(invoiceId)) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    const paymentDate = normalizeDate(payload.payment_date || payload.paymentDate || new Date().toISOString());
    const bookingPeriod = normalizePeriod(payload.booking_period || payload.bookingPeriod) || periodFromDate(paymentDate);
    const totalAmount = toNumber(payload.total_amount ?? payload.totalAmount ?? payload.amount_gross ?? payload.amountGross ?? payload.amount, 0);
    const createdBy = actorOrSystem(actor);

    this.enforceSpendApproval('finance:write', totalAmount, actor, 'create_payment');

    return this.repository.createPayment({
      payment_no: payload.payment_no || payload.paymentNo,
      contact_id: contactId,
      invoice_id: invoiceId,
      payment_date: paymentDate,
      booking_period: bookingPeriod,
      payment_method: payload.payment_method || payload.paymentMethod || null,
      currency: payload.currency || 'EUR',
      amount_net: toNumber(payload.amount_net ?? payload.amountNet, totalAmount),
      tax_amount: toNumber(payload.tax_amount ?? payload.taxAmount, 0),
      total_amount: totalAmount,
      description: payload.description || null,
      nextcloud_path: payload.nextcloud_path || payload.nextcloudPath || null,
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name,
      fx_rate: toNumber(payload.fx_rate ?? payload.fxRate, 1),
      amount_base_currency: toNumber(payload.amount_base_currency ?? payload.amountBaseCurrency, totalAmount)
    });
  }

  createJournalEntry(payload = {}, actor = null) {
    requireField(payload.description, 'description is required');
    const entryDate = normalizeDate(payload.entry_date || payload.entryDate || new Date().toISOString());
    const bookingPeriod = normalizePeriod(payload.booking_period || payload.bookingPeriod) || periodFromDate(entryDate);
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const createdBy = actorOrSystem(actor);
    const totalDebit = lines
      .filter((line) => line && line.side === 'debit')
      .reduce((sum, line) => sum + toNumber(line.amount, 0), 0);

    this.enforceSpendApproval('finance:write', totalDebit, actor, 'create_journal_entry');

    return this.repository.createJournalEntry({
      entry_no: payload.entry_no || payload.entryNo,
      entry_date: entryDate,
      booking_period: bookingPeriod,
      description: payload.description,
      lines,
      currency: payload.currency || 'EUR',
      nextcloud_path: payload.nextcloud_path || payload.nextcloudPath || null,
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name,
      txn_type: payload.txn_type || payload.txnType || 'journal'
    });
  }

  getInvoice(id) {
    return this.repository.getInvoiceById(id);
  }

  getPayment(id) {
    return this.repository.getPaymentById(id);
  }

  getJournalEntry(id) {
    return this.repository.getJournalEntryById(id);
  }

  reportPl(filters = {}) {
    return this.repository.getProfitAndLoss(filters);
  }

  reportVat(filters = {}) {
    return this.repository.getVatReport(filters);
  }

  reportOpenAr(filters = {}) {
    return this.repository.getOpenAr(filters);
  }
}

module.exports = FinanceService;

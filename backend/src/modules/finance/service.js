const FinanceRepository = require('./repository');
const { normalizeDate, normalizePeriod, periodFromDate, toNumber } = require('./utils');
const { approvalsService } = require("../approvals");

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

  enforcePolicyApproval(scope, amount, actor, operation, payload = {}) {
    const actorId = actor?.id ? String(actor.id) : null;
    approvalsService.ensureApprovedOrThrow({
      scope,
      amount: toNumber(amount, 0),
      cost_center: payload.cost_center || payload.costCenter || null,
      reference_type: operation,
      requester_id: actorId,
      reason: payload.description || null
    });
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

  listPayments(filters = {}) {
    return this.repository.listPayments(filters);
  }

  listJournalEntries(filters = {}) {
    return this.repository.listJournalEntries(filters);
  }

  async createInvoice(payload = {}, actor = null) {
    requireField(payload.contact_id || payload.contactId, 'contact_id is required');
    const contactId = Number(payload.contact_id || payload.contactId);
    
    const contact = this.repository.getContact(contactId);
    if (!contact) {
      const error = new Error('Contact not found');
      error.statusCode = 404;
      throw error;
    }

    const businessPartnerIdRaw = payload.business_partner_id ?? payload.businessPartnerId;
    const businessPartnerId = businessPartnerIdRaw ? Number(businessPartnerIdRaw) : null;
    let businessPartnerName = null;
    if (businessPartnerId) {
      const partner = this.repository.getContact(businessPartnerId);
      if (!partner) {
        const error = new Error('Business partner not found');
        error.statusCode = 404;
        throw error;
      }
      businessPartnerName = partner.name || null;
    }

    const issueDate = normalizeDate(payload.issue_date || payload.issueDate || new Date().toISOString());
    const bookingPeriod = normalizePeriod(payload.booking_period || payload.bookingPeriod) || periodFromDate(issueDate);
    const subtotalNet = toNumber(payload.subtotal_net ?? payload.subtotalNet, 0);
    
    // Determine reverse charge and VAT rate
    let reverseCharge = payload.reverse_charge ?? payload.reverseCharge ?? false;
    let taxRate = toNumber(payload.tax_rate ?? payload.taxRate, 20); // Default 20%
    
    // Auto-detect reverse charge for EU customers with valid VAT
    if (!reverseCharge && contact.vat_valid === 1 && contact.vat_country && contact.vat_country !== 'AT') {
      // EU customer with valid VAT number → reverse charge applies
      reverseCharge = true;
    }
    
    // If reverse charge applies, VAT rate is 0
    if (reverseCharge) {
      taxRate = 0;
    }
    
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

    this.enforcePolicyApproval("invoice", totalGross, actor, "create_invoice", payload);
    this.enforceSpendApproval('finance:write', totalGross, actor, 'create_invoice');

    // Prepare invoice lines with reverse charge note if applicable
    let lines = Array.isArray(payload.lines) ? payload.lines : [];
    if (reverseCharge && lines.length > 0) {
      // Add reverse charge note to description
      lines = lines.map(line => ({
        ...line,
        description: line.description ? `${line.description} (Steuerschuldnerschaft des Leistungsempfängers)` : 'Steuerschuldnerschaft des Leistungsempfängers'
      }));
    }

    return this.repository.createInvoice({
      invoice_no: payload.invoice_no || payload.invoiceNo,
      invoice_type: payload.invoice_type || payload.invoiceType || 'invoice',
      contact_id: contactId,
      business_partner_id: businessPartnerId,
      business_partner_name: businessPartnerName,
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
      lines: lines,
      nextcloud_path: payload.nextcloud_path || payload.nextcloudPath || null,
      created_by_type: createdBy.type,
      created_by_id: createdBy.id,
      created_by_name: createdBy.name,
      fx_rate: toNumber(payload.fx_rate ?? payload.fxRate, 1),
      amount_base_currency: toNumber(payload.amount_base_currency ?? payload.amountBaseCurrency, totalGross),
      reverse_charge: reverseCharge ? 1 : 0,
      vat_rate: taxRate
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

    const businessPartnerIdRaw = payload.business_partner_id ?? payload.businessPartnerId;
    const businessPartnerId = businessPartnerIdRaw ? Number(businessPartnerIdRaw) : null;
    let businessPartnerName = null;
    if (businessPartnerId) {
      const partner = this.repository.getContact(businessPartnerId);
      if (!partner) {
        const error = new Error('Business partner not found');
        error.statusCode = 404;
        throw error;
      }
      businessPartnerName = partner.name || null;
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

    this.enforcePolicyApproval("payment", totalAmount, actor, "create_payment", payload);
    this.enforceSpendApproval('finance:write', totalAmount, actor, 'create_payment');

    return this.repository.createPayment({
      payment_no: payload.payment_no || payload.paymentNo,
      contact_id: contactId,
      business_partner_id: businessPartnerId,
      business_partner_name: businessPartnerName,
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

    this.enforcePolicyApproval("journal", totalDebit, actor, "create_journal_entry", payload);
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

  /**
   * Update invoice with reverse charge setting
   * @param {number} id - Invoice ID
   * @param {Object} payload - Update payload
   * @param {Object} actor - Actor information
   * @returns {Object} Updated invoice
   */
  updateInvoice(id, payload = {}, actor = null) {
    const invoice = this.repository.getInvoiceById(id);
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.statusCode = 404;
      throw error;
    }

    // Only allow updating reverse_charge and vat_rate fields via this method
    const allowedFields = ['reverse_charge', 'reverseCharge', 'vat_rate', 'vatRate'];
    const updatePayload = {};
    
    for (const [key, value] of Object.entries(payload)) {
      if (allowedFields.includes(key)) {
        const dbField = key === 'reverseCharge' ? 'reverse_charge' : 
                       key === 'vatRate' ? 'vat_rate' : key;
        updatePayload[dbField] = value;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return invoice;
    }

    // If reverse charge is being set, adjust VAT rate to 0
    if (updatePayload.reverse_charge === 1 || updatePayload.reverse_charge === true) {
      updatePayload.vat_rate = 0;
      updatePayload.tax_amount = 0;
      updatePayload.total_gross = invoice.subtotal_net;
    }

    return this.repository.updateInvoice(id, updatePayload);
  }
}

module.exports = FinanceService;
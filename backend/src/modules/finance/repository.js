const crypto = require('crypto');
const { ensureFinanceSchema } = require('./schema');
const {
  buildRowHash,
  normalizeDate,
  normalizePeriod,
  parseJson,
  periodFromDate,
  nextDocumentPath,
  toJson,
  toNumber
} = require('./utils');

function mapInvoice(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    invoice_no: row.invoice_no,
    invoice_type: row.invoice_type,
    contact_id: row.contact_id,
    business_partner_id: row.business_partner_id,
    business_partner_name: row.business_partner_name || row.bp_name || null,
    business_partner: (row.business_partner_id || row.business_partner_name || row.bp_name)
      ? {
        id: row.business_partner_id || null,
        name: row.business_partner_name || row.bp_name || null
      }
      : null,
    issue_date: row.issue_date,
    due_date: row.due_date,
    booking_period: row.booking_period,
    status: row.status,
    currency: row.currency,
    subtotal_net: row.subtotal_net,
    tax_rate: row.tax_rate,
    reverse_charge: row.reverse_charge === 1,
    vat_rate: row.vat_rate,
    vat_note: row.reverse_charge === 1 ? 'Steuerschuldnerschaft des Leistungsempfängers' : null,
    is_eu_b2b: row.vat_country && row.vat_country !== 'AT' && row.vat_valid === 1 ? true : false,
    tax_amount: row.tax_amount,
    total_gross: row.total_gross,
    paid_amount: row.paid_amount,
    balance_amount: row.balance_amount,
    description: row.description,
    lines: parseJson(row.lines_json, []),
    nextcloud_path: row.nextcloud_path,
    transaction_log_id: row.transaction_log_id,
    system_log_id: row.system_log_id,
    is_storno: row.is_storno === 1,
    storno_of_invoice_id: row.storno_of_invoice_id,
    created_by: {
      type: row.created_by_type,
      id: row.created_by_id,
      name: row.created_by_name
    },
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapPayment(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    payment_no: row.payment_no,
    contact_id: row.contact_id,
    business_partner_id: row.business_partner_id,
    business_partner_name: row.business_partner_name || row.bp_name || null,
    business_partner: (row.business_partner_id || row.business_partner_name || row.bp_name)
      ? {
        id: row.business_partner_id || null,
        name: row.business_partner_name || row.bp_name || null
      }
      : null,
    invoice_id: row.invoice_id,
    payment_date: row.payment_date,
    booking_period: row.booking_period,
    payment_method: row.payment_method,
    currency: row.currency,
    amount_net: row.amount_net,
    tax_amount: row.tax_amount,
    total_amount: row.total_amount,
    description: row.description,
    nextcloud_path: row.nextcloud_path,
    transaction_log_id: row.transaction_log_id,
    system_log_id: row.system_log_id,
    is_storno: row.is_storno === 1,
    storno_of_payment_id: row.storno_of_payment_id,
    created_by: {
      type: row.created_by_type,
      id: row.created_by_id,
      name: row.created_by_name
    },
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapJournalEntry(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    entry_no: row.entry_no,
    entry_date: row.entry_date,
    booking_period: row.booking_period,
    status: row.status,
    description: row.description,
    lines: parseJson(row.lines_json, []),
    currency: row.currency,
    total_debit: row.total_debit,
    total_credit: row.total_credit,
    nextcloud_path: row.nextcloud_path,
    transaction_log_id: row.transaction_log_id,
    system_log_id: row.system_log_id,
    is_storno: row.is_storno === 1,
    storno_of_entry_id: row.storno_of_entry_id,
    created_by: {
      type: row.created_by_type,
      id: row.created_by_id,
      name: row.created_by_name
    },
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

class FinanceRepository {
  ensure() {
    return ensureFinanceSchema();
  }

  getInvoiceRowById(db, id) {
    return db.prepare(`SELECT i.*, COALESCE(bp.name, i.business_partner_name) AS bp_name, c.vat_country, c.vat_valid FROM invoices i LEFT JOIN contacts bp ON bp.id = i.business_partner_id LEFT JOIN contacts c ON c.id = i.contact_id WHERE i.id = ? LIMIT 1`).get(Number(id)) || null;
  }

  getPaymentRowById(db, id) {
    return db.prepare(`SELECT p.*, COALESCE(bp.name, p.business_partner_name) AS bp_name FROM payments p LEFT JOIN contacts bp ON bp.id = p.business_partner_id WHERE p.id = ? LIMIT 1`).get(Number(id)) || null;
  }

  getJournalEntryRowById(db, id) {
    return db.prepare('SELECT * FROM journal_entries WHERE id = ? LIMIT 1').get(Number(id)) || null;
  }

  contactExists(contactId) {
    const db = this.ensure();
    const row = db.prepare('SELECT id FROM contacts WHERE id = ? LIMIT 1').get(Number(contactId));
    return Boolean(row);
  }

  getContact(contactId) {
    const db = this.ensure();
    return db.prepare('SELECT * FROM contacts WHERE id = ? LIMIT 1').get(Number(contactId)) || null;
  }

  getAccountingPeriod(period) {
    const db = this.ensure();
    return db.prepare('SELECT * FROM accounting_periods WHERE period = ? LIMIT 1').get(period) || null;
  }

  getApplicableSpendApprovalRule(scope, amountUsd) {
    const db = this.ensure();
    const normalizedScope = String(scope || '*');
    const normalizedAmount = toNumber(amountUsd, 0);
    const row = db.prepare(
      `SELECT *
         FROM spend_approval_rules
        WHERE threshold_usd <= ?
          AND (scope = ? OR scope = '*')
        ORDER BY CASE WHEN scope = ? THEN 0 ELSE 1 END, threshold_usd DESC, id ASC
        LIMIT 1`
    ).get(normalizedAmount, normalizedScope, normalizedScope);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      threshold_usd: toNumber(row.threshold_usd, 0),
      approver_key_id: row.approver_key_id,
      scope: row.scope,
      auto_approve_usd: row.auto_approve_usd === null ? null : toNumber(row.auto_approve_usd, 0),
      notify_human_usd: row.notify_human_usd === null ? null : toNumber(row.notify_human_usd, 0),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  ensurePeriodOpen(period) {
    const row = this.getAccountingPeriod(period);
    if (row && (row.is_locked === 1 || row.is_locked === true)) {
      const error = new Error(`Accounting period ${period} is locked`);
      error.statusCode = 409;
      throw error;
    }
  }

  nextSequence(db, table) {
    const row = db.prepare(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${table}`).get();
    return Number(row?.max_id || 0) + 1;
  }

  nextNumber(db, table, prefix) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    const count = Number(row?.count || 0) + 1;
    return `${prefix}-${String(count).padStart(4, '0')}`;
  }

  nextTxnSequence(db) {
    const row = db.prepare('SELECT COALESCE(MAX(txn_sequence), 0) AS max_sequence FROM transaction_log').get();
    return Number(row?.max_sequence || 0) + 1;
  }

  insertTransactionLog(db, entry) {
    const prevRow = db.prepare('SELECT row_hash FROM transaction_log ORDER BY txn_sequence DESC, id DESC LIMIT 1').get();
    const prevHash = prevRow?.row_hash || 'GENESIS';
    const txnSequence = this.nextTxnSequence(db);
    const txnId = entry.txn_id || `txn_${crypto.randomUUID()}`;
    const postedAt = entry.posted_at || new Date().toISOString();
    const payload = {
      txn_id: txnId,
      txn_sequence: txnSequence,
      posted_at: postedAt,
      value_date: entry.value_date,
      booking_period: entry.booking_period,
      txn_type: entry.txn_type,
      document_ref: entry.document_ref || null,
      description: entry.description,
      debit_account: entry.debit_account,
      credit_account: entry.credit_account,
      amount_net: toNumber(entry.amount_net, 0),
      tax_rate: toNumber(entry.tax_rate, 0),
      tax_amount: toNumber(entry.tax_amount, 0),
      amount_gross: toNumber(entry.amount_gross, 0),
      currency: entry.currency || 'EUR',
      fx_rate: toNumber(entry.fx_rate, 1),
      amount_base_currency: toNumber(entry.amount_base_currency, 0),
      cost_center: entry.cost_center || null,
      project_id: entry.project_id || null,
      contact_id: entry.contact_id || null,
      created_by_type: entry.created_by_type,
      created_by_id: entry.created_by_id,
      created_by_name: entry.created_by_name,
      system_log_id: entry.system_log_id || null,
      is_storno: entry.is_storno ? 1 : 0,
      storno_of_txn: entry.storno_of_txn || null,
      period_locked: entry.period_locked ? 1 : 0,
      prev_hash: prevHash,
      row_hash: null,
      nextcloud_path: entry.nextcloud_path || null
    };

    payload.row_hash = buildRowHash(payload);

    db.prepare(
      `INSERT INTO transaction_log (
        txn_id, txn_sequence, posted_at, value_date, booking_period, txn_type, document_ref,
        description, debit_account, credit_account, amount_net, tax_rate, tax_amount,
        amount_gross, currency, fx_rate, amount_base_currency, cost_center, project_id,
        contact_id, created_by_type, created_by_id, created_by_name, system_log_id,
        is_storno, storno_of_txn, period_locked, prev_hash, row_hash, nextcloud_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      payload.txn_id,
      payload.txn_sequence,
      payload.posted_at,
      payload.value_date,
      payload.booking_period,
      payload.txn_type,
      payload.document_ref,
      payload.description,
      payload.debit_account,
      payload.credit_account,
      payload.amount_net,
      payload.tax_rate,
      payload.tax_amount,
      payload.amount_gross,
      payload.currency,
      payload.fx_rate,
      payload.amount_base_currency,
      payload.cost_center,
      payload.project_id,
      payload.contact_id,
      payload.created_by_type,
      payload.created_by_id,
      payload.created_by_name,
      payload.system_log_id,
      payload.is_storno,
      payload.storno_of_txn,
      payload.period_locked,
      payload.prev_hash,
      payload.row_hash,
      payload.nextcloud_path
    );

    return payload;
  }

  createInvoice(record) {
    const db = this.ensure();
    const invoiceNo = record.invoice_no || this.nextNumber(db, 'invoices', 'INV');
    const issueDate = normalizeDate(record.issue_date);
    const dueDate = normalizeDate(record.due_date);
    const bookingPeriod = normalizePeriod(record.booking_period) || periodFromDate(issueDate);

    if (!issueDate || !bookingPeriod) {
      const error = new Error('issue_date and booking_period are required');
      error.statusCode = 400;
      throw error;
    }

    this.ensurePeriodOpen(bookingPeriod);

    const tx = db.transaction(() => {
      const nextcloudPath = record.nextcloud_path || nextDocumentPath('Outgoing-Invoices', invoiceNo, `${invoiceNo}.pdf`);
      const txn = this.insertTransactionLog(db, {
        value_date: issueDate,
        booking_period: bookingPeriod,
        txn_type: 'invoice',
        document_ref: invoiceNo,
        description: record.description || `Invoice ${invoiceNo}`,
        debit_account: record.debit_account || '1400',
        credit_account: record.credit_account || '8400',
        amount_net: record.subtotal_net,
        tax_rate: record.tax_rate,
        tax_amount: record.tax_amount,
        amount_gross: record.total_gross,
        currency: record.currency || 'EUR',
        fx_rate: record.fx_rate || 1,
        amount_base_currency: record.amount_base_currency || record.total_gross,
        contact_id: record.contact_id,
        created_by_type: record.created_by_type,
        created_by_id: record.created_by_id,
        created_by_name: record.created_by_name,
        nextcloud_path: nextcloudPath
      });

      const insert = db.prepare(
        `INSERT INTO invoices (
          invoice_no, invoice_type, contact_id, business_partner_id, business_partner_name, issue_date, due_date, booking_period,
          status, currency, subtotal_net, tax_rate, tax_amount, total_gross,
          paid_amount, balance_amount, description, lines_json, nextcloud_path,
          transaction_log_id, system_log_id, is_storno, storno_of_invoice_id,
          created_by_type, created_by_id, created_by_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      const info = insert.run(
        invoiceNo,
        record.invoice_type || 'invoice',
        record.contact_id,
        record.business_partner_id || null,
        record.business_partner_name || null,
        issueDate,
        dueDate,
        bookingPeriod,
        record.status || 'issued',
        record.currency || 'EUR',
        record.subtotal_net,
        record.tax_rate,
        record.tax_amount,
        record.total_gross,
        record.paid_amount || 0,
        record.balance_amount,
        record.description || null,
        toJson(record.lines || []),
        nextcloudPath,
        txn.txn_id,
        record.system_log_id || null,
        record.is_storno ? 1 : 0,
        record.storno_of_invoice_id || null,
        record.created_by_type,
        record.created_by_id,
        record.created_by_name
      );

      return mapInvoice(this.getInvoiceRowById(db, info.lastInsertRowid));
    });

    return tx();
  }

  updateInvoicePayment(db, invoiceId, amount) {
    const invoice = this.getInvoiceRowById(db, invoiceId);
    if (!invoice) {
      return null;
    }

    this.ensurePeriodOpen(invoice.booking_period);

    const paidAmount = toNumber(invoice.paid_amount, 0) + toNumber(amount, 0);
    const totalGross = toNumber(invoice.total_gross, 0);
    const balanceAmount = Math.max(0, totalGross - paidAmount);
    const status = balanceAmount === 0 ? 'paid' : 'partially_paid';

    db.prepare(
      `UPDATE invoices
       SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(paidAmount, balanceAmount, status, invoiceId);

    return this.getInvoiceRowById(db, invoiceId);
  }

  createPayment(record) {
    const db = this.ensure();
    const paymentNo = record.payment_no || this.nextNumber(db, 'payments', 'PAY');
    const paymentDate = normalizeDate(record.payment_date);
    const bookingPeriod = normalizePeriod(record.booking_period) || periodFromDate(paymentDate);

    if (!paymentDate || !bookingPeriod) {
      const error = new Error('payment_date and booking_period are required');
      error.statusCode = 400;
      throw error;
    }

    this.ensurePeriodOpen(bookingPeriod);

    const tx = db.transaction(() => {
      const nextcloudPath = record.nextcloud_path || nextDocumentPath('Incoming-Payments', paymentNo, `${paymentNo}.pdf`);
      const txn = this.insertTransactionLog(db, {
        value_date: paymentDate,
        booking_period: bookingPeriod,
        txn_type: 'payment',
        document_ref: paymentNo,
        description: record.description || `Payment ${paymentNo}`,
        debit_account: record.debit_account || '1200',
        credit_account: record.credit_account || '1400',
        amount_net: record.amount_net,
        tax_rate: record.tax_rate || 0,
        tax_amount: record.tax_amount || 0,
        amount_gross: record.total_amount,
        currency: record.currency || 'EUR',
        fx_rate: record.fx_rate || 1,
        amount_base_currency: record.amount_base_currency || record.total_amount,
        contact_id: record.contact_id,
        created_by_type: record.created_by_type,
        created_by_id: record.created_by_id,
        created_by_name: record.created_by_name,
        nextcloud_path: nextcloudPath
      });

      const insert = db.prepare(
        `INSERT INTO payments (
          payment_no, contact_id, business_partner_id, business_partner_name, invoice_id, payment_date, booking_period, payment_method,
          currency, amount_net, tax_amount, total_amount, description, nextcloud_path,
          transaction_log_id, system_log_id, is_storno, storno_of_payment_id,
          created_by_type, created_by_id, created_by_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      const info = insert.run(
        paymentNo,
        record.contact_id,
        record.business_partner_id || null,
        record.business_partner_name || null,
        record.invoice_id || null,
        paymentDate,
        bookingPeriod,
        record.payment_method || null,
        record.currency || 'EUR',
        record.amount_net,
        record.tax_amount || 0,
        record.total_amount,
        record.description || null,
        nextcloudPath,
        txn.txn_id,
        record.system_log_id || null,
        record.is_storno ? 1 : 0,
        record.storno_of_payment_id || null,
        record.created_by_type,
        record.created_by_id,
        record.created_by_name
      );

      if (record.invoice_id) {
        const updatedInvoice = this.updateInvoicePayment(db, record.invoice_id, record.total_amount);
        if (!updatedInvoice) {
          const error = new Error('Invoice not found');
          error.statusCode = 404;
          throw error;
        }
      }

      return mapPayment(this.getPaymentRowById(db, info.lastInsertRowid));
    });

    return tx();
  }

  createJournalEntry(record) {
    const db = this.ensure();
    const entryNo = record.entry_no || this.nextNumber(db, 'journal_entries', 'JE');
    const entryDate = normalizeDate(record.entry_date);
    const bookingPeriod = normalizePeriod(record.booking_period) || periodFromDate(entryDate);

    if (!entryDate || !bookingPeriod) {
      const error = new Error('entry_date and booking_period are required');
      error.statusCode = 400;
      throw error;
    }

    const lines = Array.isArray(record.lines) ? record.lines : [];
    const totalDebit = lines.filter((line) => line.side === 'debit').reduce((sum, line) => sum + toNumber(line.amount, 0), 0);
    const totalCredit = lines.filter((line) => line.side === 'credit').reduce((sum, line) => sum + toNumber(line.amount, 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      const error = new Error('Journal entry must be balanced');
      error.statusCode = 400;
      throw error;
    }

    this.ensurePeriodOpen(bookingPeriod);

    const tx = db.transaction(() => {
      const nextcloudPath = record.nextcloud_path || nextDocumentPath('General-Ledger', entryNo, `${entryNo}.json`);
      const primaryDebit = lines.find((line) => line.side === 'debit');
      const primaryCredit = lines.find((line) => line.side === 'credit');
      const txn = this.insertTransactionLog(db, {
        value_date: entryDate,
        booking_period: bookingPeriod,
        txn_type: record.txn_type || 'manual',
        document_ref: entryNo,
        description: record.description,
        debit_account: primaryDebit?.account || '0000',
        credit_account: primaryCredit?.account || '0000',
        amount_net: totalDebit,
        tax_rate: 0,
        tax_amount: 0,
        amount_gross: totalDebit,
        currency: record.currency || 'EUR',
        fx_rate: 1,
        amount_base_currency: totalDebit,
        contact_id: record.contact_id || null,
        created_by_type: record.created_by_type,
        created_by_id: record.created_by_id,
        created_by_name: record.created_by_name,
        nextcloud_path: nextcloudPath
      });

      const insert = db.prepare(
        `INSERT INTO journal_entries (
          entry_no, entry_date, booking_period, status, description, lines_json, currency,
          total_debit, total_credit, nextcloud_path, transaction_log_id, system_log_id,
          is_storno, storno_of_entry_id, created_by_type, created_by_id, created_by_name,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );

      const info = insert.run(
        entryNo,
        entryDate,
        bookingPeriod,
        record.status || 'posted',
        record.description,
        toJson(lines),
        record.currency || 'EUR',
        totalDebit,
        totalCredit,
        nextcloudPath,
        txn.txn_id,
        record.system_log_id || null,
        record.is_storno ? 1 : 0,
        record.storno_of_entry_id || null,
        record.created_by_type,
        record.created_by_id,
        record.created_by_name
      );

      return mapJournalEntry(this.getJournalEntryRowById(db, info.lastInsertRowid));
    });

    return tx();
  }

  listInvoices(filters = {}) {
    const db = this.ensure();
    const clauses = [];
    const values = [];

    if (filters.contact_id) {
      clauses.push('contact_id = ?');
      values.push(Number(filters.contact_id));
    }

    if (filters.status) {
      clauses.push('status = ?');
      values.push(filters.status);
    }

    if (filters.from) {
      clauses.push('issue_date >= ?');
      values.push(normalizeDate(filters.from));
    }

    if (filters.to) {
      clauses.push('issue_date <= ?');
      values.push(normalizeDate(filters.to));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const whereSql = where ? where.replace(/\bcontact_id\b/g, 'i.contact_id').replace(/\bstatus\b/g, 'i.status').replace(/\bissue_date\b/g, 'i.issue_date') : '';
    const rows = db.prepare(`SELECT i.*, COALESCE(bp.name, i.business_partner_name) AS bp_name FROM invoices i LEFT JOIN contacts bp ON bp.id = i.business_partner_id ${whereSql} ORDER BY i.issue_date DESC, i.id DESC`).all(...values);
    return rows.map(mapInvoice);
  }

  getInvoiceById(id) {
    const db = this.ensure();
    const row = this.getInvoiceRowById(db, id);
    return mapInvoice(row);
  }

  getInvoiceByNo(invoiceNo) {
    const db = this.ensure();
    const row = db.prepare('SELECT i.*, COALESCE(bp.name, i.business_partner_name) AS bp_name FROM invoices i LEFT JOIN contacts bp ON bp.id = i.business_partner_id WHERE i.invoice_no = ? LIMIT 1').get(invoiceNo);
    return mapInvoice(row);
  }

  getPaymentById(id) {
    const db = this.ensure();
    const row = this.getPaymentRowById(db, id);
    return mapPayment(row);
  }

  getJournalEntryById(id) {
    const db = this.ensure();
    const row = this.getJournalEntryRowById(db, id);
    return mapJournalEntry(row);
  }

  listPayments(filters = {}) {
    const db = this.ensure();
    const clauses = [];
    const values = [];

    if (filters.invoice_id) {
      clauses.push('invoice_id = ?');
      values.push(Number(filters.invoice_id));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const whereSql = where ? where.replace(/\binvoice_id\b/g, 'p.invoice_id') : '';
    const rows = db.prepare(`SELECT p.*, COALESCE(bp.name, p.business_partner_name) AS bp_name FROM payments p LEFT JOIN contacts bp ON bp.id = p.business_partner_id ${whereSql} ORDER BY p.payment_date DESC, p.id DESC`).all(...values);
    return rows.map(mapPayment);
  }

  listJournalEntries(filters = {}) {
    const db = this.ensure();
    const clauses = [];
    const values = [];

    if (filters.period) {
      clauses.push('booking_period = ?');
      values.push(normalizePeriod(filters.period));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM journal_entries ${where} ORDER BY entry_date DESC, id DESC`).all(...values);
    return rows.map(mapJournalEntry);
  }

  getOpenAr(filters = {}) {
    const db = this.ensure();
    const rows = db.prepare(
      `SELECT * FROM invoices WHERE balance_amount > 0 AND status IN ('issued', 'partially_paid') ORDER BY due_date ASC, issue_date ASC`
    ).all();

    const today = normalizeDate(filters.as_of || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const buckets = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_plus: 0
    };

    const items = rows.map((row) => {
      const invoice = mapInvoice(row);
      const dueDate = normalizeDate(invoice.due_date || invoice.issue_date);
      const age = dueDate ? Math.floor((new Date(`${today}T00:00:00Z`) - new Date(`${dueDate}T00:00:00Z`)) / 86400000) : 0;
      const bucket = age <= 0 ? 'current' : age <= 30 ? 'days_1_30' : age <= 60 ? 'days_31_60' : 'days_61_plus';
      buckets[bucket] += toNumber(invoice.balance_amount, 0);
      return {
        ...invoice,
        age_days: age,
        bucket
      };
    });

    return {
      as_of: today,
      total_open: items.reduce((sum, item) => sum + toNumber(item.balance_amount, 0), 0),
      buckets,
      items
    };
  }

  getProfitAndLoss(filters = {}) {
    const db = this.ensure();
    const from = normalizeDate(filters.from || filters.start || '1970-01-01') || '1970-01-01';
    const to = normalizeDate(filters.to || filters.end || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const rows = db.prepare(
      `SELECT * FROM transaction_log WHERE posted_at >= ? AND posted_at <= ? ORDER BY txn_sequence ASC`
    ).all(`${from}T00:00:00Z`, `${to}T23:59:59Z`);

    const revenue = rows.filter((row) => row.txn_type === 'invoice').reduce((sum, row) => sum + toNumber(row.amount_net, 0), 0);
    const cogs = rows.filter((row) => row.debit_account && /^5/.test(String(row.debit_account))).reduce((sum, row) => sum + toNumber(row.amount_net, 0), 0);
    const operatingExpenses = rows.filter((row) => row.debit_account && /^6/.test(String(row.debit_account))).reduce((sum, row) => sum + toNumber(row.amount_net, 0), 0);
    const otherIncome = rows.filter((row) => ['journal', 'manual'].includes(row.txn_type)).reduce((sum, row) => sum + toNumber(row.amount_net, 0), 0);

    return {
      from,
      to,
      revenue,
      cogs,
      gross_profit: revenue - cogs,
      operating_expenses: operatingExpenses,
      other_income: otherIncome,
      ebitda: revenue - cogs - operatingExpenses + otherIncome,
      transactions: rows.length
    };
  }

  getVatReport(filters = {}) {
    const db = this.ensure();
    const from = normalizeDate(filters.from || '1970-01-01') || '1970-01-01';
    const to = normalizeDate(filters.to || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const rows = db.prepare(
      `SELECT * FROM transaction_log WHERE posted_at >= ? AND posted_at <= ? ORDER BY txn_sequence ASC`
    ).all(`${from}T00:00:00Z`, `${to}T23:59:59Z`);

    const outputVat = rows.filter((row) => row.txn_type === 'invoice').reduce((sum, row) => sum + toNumber(row.tax_amount, 0), 0);
    const inputVat = rows.filter((row) => ['manual', 'journal'].includes(row.txn_type)).reduce((sum, row) => sum + toNumber(row.tax_amount, 0), 0);

    return {
      from,
      to,
      output_vat: outputVat,
      input_vat: inputVat,
      net_vat: outputVat - inputVat,
      transactions: rows.length
    };
  }

  setPeriodLock(period, locked, actor = null, notes = null) {
    const db = this.ensure();
    const normalizedPeriod = normalizePeriod(period);
    if (!normalizedPeriod) {
      const error = new Error('period is required');
      error.statusCode = 400;
      throw error;
    }

    const existing = this.getAccountingPeriod(normalizedPeriod);
    if (existing) {
      db.prepare(
        `UPDATE accounting_periods SET is_locked = ?, locked_at = ?, locked_by = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE period = ?`
      ).run(locked ? 1 : 0, locked ? new Date().toISOString() : null, locked ? (actor?.name || actor?.username || actor?.id || null) : null, notes || null, normalizedPeriod);
    } else {
      db.prepare(
        `INSERT INTO accounting_periods (period, is_locked, locked_at, locked_by, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(normalizedPeriod, locked ? 1 : 0, locked ? new Date().toISOString() : null, locked ? (actor?.name || actor?.username || actor?.id || null) : null, notes || null);
    }

    return this.getAccountingPeriod(normalizedPeriod);
  }
}

module.exports = FinanceRepository;

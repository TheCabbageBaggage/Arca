const { ensureFinanceSchema } = require('../finance/schema');
const { normalizeDate, toNumber } = require('../finance/utils');

const CASH_ACCOUNTS = new Set(['1000', '1010', '1020', '1200', '1210', '1220', '1250']);

function daysBetween(fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  return Math.floor((end - start) / 86400000);
}

function agingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90_plus';
}

class ReportsRepository {
  ensure() {
    const db = ensureFinanceSchema();
    db.exec('CREATE TABLE IF NOT EXISTS report_budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, group_type TEXT NOT NULL, group_name TEXT NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL, amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT "EUR", notes TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    return db;
  }

  listTransactions(from, to) {
    const db = this.ensure();
    return db.prepare(
      `SELECT * FROM transaction_log WHERE posted_at >= ? AND posted_at <= ? ORDER BY txn_sequence ASC, id ASC`
    ).all(`${from}T00:00:00Z`, `${to}T23:59:59Z`);
  }

  cashDeltaForRow(row) {
    const amount = toNumber(row.amount_gross ?? row.amount_base_currency, 0);
    let delta = 0;
    if (row.debit_account && CASH_ACCOUNTS.has(String(row.debit_account))) delta += amount;
    if (row.credit_account && CASH_ACCOUNTS.has(String(row.credit_account))) delta -= amount;
    return delta;
  }

  getCashFlow({ from, to, method = 'direct' }) {
    const normalizedFrom = normalizeDate(from || '1970-01-01') || '1970-01-01';
    const normalizedTo = normalizeDate(to || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const txRows = this.listTransactions(normalizedFrom, normalizedTo);

    const operating = { receipts_from_customers: 0, payments_to_suppliers_employees: 0, net: 0 };
    const investing = { capex: 0, asset_sales: 0, net: 0 };
    const financing = { loans: 0, equity: 0, net: 0 };

    for (const row of txRows) {
      const amount = toNumber(row.amount_gross ?? row.amount_base_currency, 0);
      const debit = String(row.debit_account || '');
      const credit = String(row.credit_account || '');
      const description = String(row.description || '').toLowerCase();
      const type = String(row.txn_type || '').toLowerCase();

      if (type === 'invoice') operating.receipts_from_customers += amount;
      if (type === 'payment' || /^5|^6/.test(debit)) operating.payments_to_suppliers_employees += amount;

      if (/capex|asset/.test(description) || /^0/.test(debit)) investing.capex += amount;
      if (/asset sale|asset disposal/.test(description) || /^0/.test(credit)) investing.asset_sales += amount;

      if (/loan/.test(description) || /^3/.test(credit)) financing.loans += amount;
      if (/equity|share capital/.test(description) || /^2|^3/.test(credit)) financing.equity += amount;
    }

    operating.net = operating.receipts_from_customers - operating.payments_to_suppliers_employees;
    investing.net = investing.asset_sales - investing.capex;
    financing.net = financing.loans + financing.equity;

    const db = this.ensure();
    const beforeRows = db.prepare('SELECT * FROM transaction_log WHERE posted_at < ? ORDER BY txn_sequence ASC, id ASC').all(`${normalizedFrom}T00:00:00Z`);
    const openingCash = beforeRows.reduce((sum, row) => sum + this.cashDeltaForRow(row), 0);
    const periodDelta = txRows.reduce((sum, row) => sum + this.cashDeltaForRow(row), 0);
    const closingCash = openingCash + periodDelta;

    return {
      from: normalizedFrom,
      to: normalizedTo,
      method,
      sections: { operating, investing, financing },
      opening_cash: Number(openingCash.toFixed(2)),
      closing_cash: Number(closingCash.toFixed(2)),
      net_change: Number((closingCash - openingCash).toFixed(2))
    };
  }

  getBudgetVsActual({ from, to, group_by = 'department' }) {
    const normalizedFrom = normalizeDate(from || '1970-01-01') || '1970-01-01';
    const normalizedTo = normalizeDate(to || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const groupBy = ['department', 'project', 'cost_center'].includes(group_by) ? group_by : 'department';
    const db = this.ensure();

    const budgetRows = db.prepare(
      `SELECT group_name, SUM(amount) AS budget_amount
         FROM report_budgets
        WHERE group_type = ?
          AND period_start <= ?
          AND period_end >= ?
        GROUP BY group_name`
    ).all(groupBy, normalizedTo, normalizedFrom);

    const txRows = this.listTransactions(normalizedFrom, normalizedTo);
    const actualByGroup = new Map();
    for (const row of txRows) {
      let key = 'Unassigned';
      if (groupBy === 'project') key = row.project_id ? String(row.project_id) : 'Unassigned';
      else if (groupBy === 'cost_center') key = row.cost_center ? String(row.cost_center) : 'Unassigned';
      else key = row.cost_center ? String(row.cost_center) : 'Unassigned';

      actualByGroup.set(key, toNumber(actualByGroup.get(key), 0) + toNumber(row.amount_base_currency || row.amount_gross, 0));
    }

    const names = new Set([...budgetRows.map((r) => r.group_name), ...actualByGroup.keys()]);
    const groups = [...names].sort().map((name) => {
      const budget = toNumber((budgetRows.find((r) => r.group_name === name) || {}).budget_amount, 0);
      const actual = toNumber(actualByGroup.get(name), 0);
      const variance = actual - budget;
      const variance_pct = budget === 0 ? null : Number(((variance / budget) * 100).toFixed(2));
      return {
        name,
        budget: Number(budget.toFixed(2)),
        actual: Number(actual.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        variance_pct
      };
    });

    return { from: normalizedFrom, to: normalizedTo, group_by: groupBy, groups };
  }

  getArAging({ as_of }) {
    const asOf = normalizeDate(as_of || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const db = this.ensure();
    const rows = db.prepare(
      `SELECT i.*, c.name AS contact_name
         FROM invoices i
         LEFT JOIN contacts c ON c.id = i.contact_id
        WHERE i.balance_amount > 0
          AND i.status IN ('issued', 'partially_paid')
        ORDER BY i.due_date ASC, i.issue_date ASC`
    ).all();

    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    const invoices = rows.map((row) => {
      const dueDate = normalizeDate(row.due_date || row.issue_date) || asOf;
      const daysOverdue = daysBetween(dueDate, asOf);
      const bucket = agingBucket(daysOverdue);
      const amount = toNumber(row.balance_amount, 0);
      buckets[bucket] += amount;
      return {
        contact_name: row.contact_name || `Contact #${row.contact_id}`,
        invoice_no: row.invoice_no,
        amount: Number(amount.toFixed(2)),
        due_date: dueDate,
        days_overdue: daysOverdue,
        bucket
      };
    });

    return {
      as_of: asOf,
      total_outstanding: Number(invoices.reduce((s, i) => s + toNumber(i.amount, 0), 0).toFixed(2)),
      buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Number(v.toFixed(2))])),
      invoices
    };
  }

  getApAging({ as_of }) {
    const asOf = normalizeDate(as_of || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const db = this.ensure();

    const rows = db.prepare(
      `SELECT i.*, c.name AS contact_name
         FROM invoices i
         LEFT JOIN contacts c ON c.id = i.contact_id
        WHERE i.balance_amount > 0
          AND i.invoice_type = 'credit_note'
        ORDER BY i.due_date ASC, i.issue_date ASC`
    ).all();

    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    const invoices = rows.map((row) => {
      const dueDate = normalizeDate(row.due_date || row.issue_date) || asOf;
      const daysOverdue = daysBetween(dueDate, asOf);
      const bucket = agingBucket(daysOverdue);
      const amount = toNumber(row.balance_amount, 0);
      buckets[bucket] += amount;
      return {
        contact_name: row.contact_name || `Contact #${row.contact_id}`,
        invoice_no: row.invoice_no,
        amount: Number(amount.toFixed(2)),
        due_date: dueDate,
        days_overdue: daysOverdue,
        bucket
      };
    });

    return {
      as_of: asOf,
      total_outstanding: Number(invoices.reduce((s, i) => s + toNumber(i.amount, 0), 0).toFixed(2)),
      buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Number(v.toFixed(2))])),
      invoices
    };
  }
}

module.exports = ReportsRepository;

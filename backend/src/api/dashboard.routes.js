const express = require('express');
const { authenticate, requireScopes } = require('../middleware/auth');
const { openDatabase } = require('../db/client');

const router = express.Router();

function num(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function getKpis() {
  const db = openDatabase();

  const cash = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN debit_account = '1200' THEN amount_base_currency ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN credit_account = '1200' THEN amount_base_currency ELSE 0 END), 0) AS value
    FROM transaction_log
    WHERE IFNULL(is_storno, 0) = 0
  `).get();

  const burn = db.prepare(`
    WITH monthly AS (
      SELECT substr(value_date, 1, 7) AS ym,
             COALESCE(SUM(amount_base_currency), 0) AS spend
      FROM transaction_log
      WHERE IFNULL(is_storno, 0) = 0
        AND date(value_date) >= date('now', 'start of month', '-2 months')
        AND (
          debit_account LIKE '6%' OR
          (txn_type = 'payment' AND debit_account LIKE '5%')
        )
      GROUP BY substr(value_date, 1, 7)
    )
    SELECT COALESCE(AVG(spend), 0) AS value FROM monthly
  `).get();

  const arOverdue = db.prepare(`
    SELECT COALESCE(SUM(balance_amount), 0) AS value
    FROM invoices
    WHERE status NOT IN ('paid', 'cancelled')
      AND IFNULL(is_storno, 0) = 0
      AND due_date IS NOT NULL
      AND date(due_date) < date('now')
  `).get();

  const ap7 = db.prepare(`
    SELECT COALESCE(SUM(i.balance_amount), 0) AS value
    FROM invoices i
    JOIN contacts c ON c.id = i.contact_id
    WHERE c.type = 'creditor'
      AND i.status NOT IN ('paid', 'cancelled')
      AND IFNULL(i.is_storno, 0) = 0
      AND i.due_date IS NOT NULL
      AND date(i.due_date) BETWEEN date('now') AND date('now', '+7 days')
  `).get();

  const ap30 = db.prepare(`
    SELECT COALESCE(SUM(i.balance_amount), 0) AS value
    FROM invoices i
    JOIN contacts c ON c.id = i.contact_id
    WHERE c.type = 'creditor'
      AND i.status NOT IN ('paid', 'cancelled')
      AND IFNULL(i.is_storno, 0) = 0
      AND i.due_date IS NOT NULL
      AND date(i.due_date) BETWEEN date('now') AND date('now', '+30 days')
  `).get();

  const pnl = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN credit_account LIKE '8%' THEN amount_base_currency ELSE 0 END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN debit_account LIKE '5%' THEN amount_base_currency ELSE 0 END), 0) AS cogs,
      COALESCE(SUM(CASE WHEN debit_account LIKE '6%' THEN amount_base_currency ELSE 0 END), 0) AS opex
    FROM transaction_log
    WHERE IFNULL(is_storno, 0) = 0
  `).get();

  const budget = db.prepare(`
    SELECT
      COALESCE(SUM(p.token_budget), 0) AS budget_tokens,
      COALESCE(SUM(s.actual_tokens), 0) AS actual_tokens
    FROM projects p
    LEFT JOIN user_stories s ON s.project_id = p.id
    WHERE p.status != 'archived'
  `).get();

  const cashBalance = num(cash?.value);
  const burnRate = num(burn?.value);
  const runway = burnRate > 0 ? cashBalance / burnRate : null;
  const revenue = num(pnl?.revenue);
  const cogs = num(pnl?.cogs);
  const opex = num(pnl?.opex);
  const grossMargin = revenue > 0 ? (revenue - cogs) / revenue : 0;
  const ebitda = revenue - cogs - opex;
  const budgetConsumption = num(budget?.budget_tokens) > 0
    ? num(budget?.actual_tokens) / num(budget?.budget_tokens)
    : 0;

  return {
    cash_balance: cashBalance,
    burn_rate: burnRate,
    runway_months: runway,
    ar_overdue: num(arOverdue?.value),
    ap_due_7d: num(ap7?.value),
    ap_due_30d: num(ap30?.value),
    gross_margin: grossMargin,
    ebitda_proxy: ebitda,
    budget_consumption: budgetConsumption
  };
}

function getAlerts() {
  const db = openDatabase();

  const pendingApprovals = db.prepare(`
    SELECT COUNT(*) AS value
    FROM agent_tasks
    WHERE task_type = 'finance_approval'
      AND status IN ('queued', 'running', 'pending', 'pending_approval')
  `).get();

  const overdueAr = db.prepare(`
    SELECT COALESCE(SUM(balance_amount), 0) AS value
    FROM invoices
    WHERE status NOT IN ('paid', 'cancelled')
      AND IFNULL(is_storno, 0) = 0
      AND due_date IS NOT NULL
      AND date(due_date) < date('now')
  `).get();

  const criticalAp = db.prepare(`
    SELECT COALESCE(SUM(i.balance_amount), 0) AS value
    FROM invoices i
    JOIN contacts c ON c.id = i.contact_id
    WHERE c.type = 'creditor'
      AND i.status NOT IN ('paid', 'cancelled')
      AND IFNULL(i.is_storno, 0) = 0
      AND i.due_date IS NOT NULL
      AND date(i.due_date) <= date('now', '+3 days')
  `).get();

  return {
    pending_approvals: num(pendingApprovals?.value),
    overdue_ar: num(overdueAr?.value),
    critical_ap: num(criticalAp?.value)
  };
}

router.get('/dashboard/kpis', authenticate, requireScopes('finance:read'), (req, res, next) => {
  try {
    res.status(200).json({ kpis: getKpis(), generated_at: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/alerts', authenticate, requireScopes('finance:read'), (req, res, next) => {
  try {
    res.status(200).json({ alerts: getAlerts(), generated_at: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

# PROJECT_PLAN_V2 — CFO-Driven ERP Requirements Expansion

## Scope
This document extends the current Arca ERP plan with CFO-priority capabilities required for financial control, auditability, and scale.

---

## 1) Inventory Management Module

**Priority:** Must-have

**User Story**
As a CFO, I need real-time visibility into stock valuation, movement, and reorder exposure so I can protect cash flow, prevent stockouts, and ensure COGS is posted correctly.

**Acceptance Criteria**
1. System supports item master data (SKU, UoM, valuation method, reorder threshold, preferred supplier).
2. Goods receipt updates on-hand quantity and creates accounting impact (inventory asset + GR/IR).
3. Goods issue (sale/consumption) reduces inventory and posts COGS based on configured valuation method (FIFO/weighted average).
4. Stock adjustment requires reason code and creates immutable audit log.
5. Inventory valuation report ties to GL inventory balance for a selected date.

**CFO Rationale**
Inventory is tied-up cash. Without valuation accuracy and movement controls, gross margin and working capital are misstated.

**API Endpoints Needed**
- `POST /api/v1/inventory/items`
- `GET /api/v1/inventory/items`
- `GET /api/v1/inventory/items/:id`
- `PATCH /api/v1/inventory/items/:id`
- `POST /api/v1/inventory/receipts`
- `POST /api/v1/inventory/issues`
- `POST /api/v1/inventory/adjustments`
- `GET /api/v1/inventory/valuation?as_of=YYYY-MM-DD`
- `GET /api/v1/inventory/movements?item_id=&from=&to=`

---

## 2) Financial Dashboard with KPIs

**Priority:** Must-have

**User Story**
As a CFO, I need a daily executive dashboard with financial KPIs so I can detect risks early and steer operations before month-end close.

**Acceptance Criteria**
1. Dashboard shows KPI tiles: cash balance, burn rate, runway, AR overdue, AP due in 7/30 days, gross margin, EBITDA proxy, budget consumption.
2. KPI definitions are documented and versioned.
3. Drill-down from every KPI to transaction-level detail.
4. Dashboard supports date filters (MTD, QTD, YTD, custom).
5. Data refresh SLA: <= 15 minutes from source transactions.

**CFO Rationale**
A CFO needs forward-looking visibility, not only retrospective reports, to prevent liquidity surprises.

**API Endpoints Needed**
- `GET /api/v1/dashboard/kpis?period=MTD|QTD|YTD|custom&from=&to=`
- `GET /api/v1/dashboard/kpis/:kpi_code/drilldown?from=&to=`
- `GET /api/v1/dashboard/cash-forecast?days=30|60|90`
- `GET /api/v1/dashboard/alerts`

---

## 3) Advanced Reporting (Cash Flow, Budget vs Actual, Aging)

**Priority:** Must-have

**User Story**
As a CFO, I need audit-ready financial reports (cash flow, budget vs actual, AR/AP aging) to manage liquidity, control spending, and support board/investor reporting.

**Acceptance Criteria**
1. Cash flow statement produced by operating/investing/financing sections and reconciles opening/closing cash.
2. Budget vs actual available by department/project/cost center with variance amount + variance %.
3. AR aging buckets: current, 1–30, 31–60, 61–90, 90+ days.
4. AP aging mirrors AR aging and highlights critical due items.
5. All reports export to CSV and PDF and include generated_at/user metadata.

**CFO Rationale**
This is the core decision package for liquidity, cost discipline, and collections/payables management.

**API Endpoints Needed**
- `GET /api/v1/reports/cash-flow?from=&to=&method=direct|indirect`
- `GET /api/v1/reports/budget-vs-actual?from=&to=&group_by=department|project|cost_center`
- `GET /api/v1/reports/ar-aging?as_of=YYYY-MM-DD`
- `GET /api/v1/reports/ap-aging?as_of=YYYY-MM-DD`
- `GET /api/v1/reports/:report_id/export?format=csv|pdf`

---

## 4) Multi-Currency Support

**Priority:** Must-have (for cross-border operations)

**User Story**
As a CFO, I need full transaction and reporting support in multiple currencies so I can operate internationally while maintaining accurate base-currency books and FX exposure control.

**Acceptance Criteria**
1. Every monetary transaction stores transaction currency, FX rate, base-currency amount, and rate source/timestamp.
2. System supports realized and unrealized FX gain/loss postings.
3. Revaluation job runs at period close for open foreign-currency items.
4. Reports can be rendered in base currency and optionally transaction currency.
5. Exchange rate table supports manual override with approval trail.

**CFO Rationale**
Without disciplined FX handling, P&L and balance sheet can be materially misstated.

**API Endpoints Needed**
- `POST /api/v1/fx/rates`
- `GET /api/v1/fx/rates?base=&quote=&date=`
- `POST /api/v1/fx/revalue?as_of=YYYY-MM-DD`
- `GET /api/v1/fx/exposure?as_of=YYYY-MM-DD`
- `GET /api/v1/finance/journal-entries?tag=fx_revaluation`

---

## 5) Approval Workflows for Larger Transactions

**Priority:** Must-have

**User Story**
As a CFO, I need configurable approval workflows by amount, vendor risk, and transaction type so that high-impact spend and postings are controlled and auditable.

**Acceptance Criteria**
1. Approval policies configurable by scope (invoice/payment/journal), threshold amount, and cost center.
2. Transactions over threshold enter `waiting_approval` and cannot post to final ledger before approval.
3. Multi-step approvals supported (e.g., manager -> finance -> CFO).
4. Full approval audit trail stored (who, when, decision, reason, before/after payload).
5. SLA alerts for pending approvals beyond configured time windows.

**CFO Rationale**
Approval governance reduces fraud/overspend risk and enforces delegation-of-authority policy.

**API Endpoints Needed**
- `POST /api/v1/approvals/policies`
- `GET /api/v1/approvals/policies`
- `PATCH /api/v1/approvals/policies/:id`
- `GET /api/v1/approvals/requests?status=pending|approved|rejected`
- `POST /api/v1/approvals/requests/:id/approve`
- `POST /api/v1/approvals/requests/:id/reject`
- `GET /api/v1/approvals/requests/:id/audit`

---

## Cross-Module Delivery Notes
- Enforce immutable audit logs across all modules.
- Require role/scope checks per endpoint (`*:read`, `*:write`, `*:approve`).
- Include idempotency keys for posting endpoints to prevent duplicate bookings.
- Ensure each financial aggregate can be reconciled to underlying transaction rows.
- Add integration tests for happy path + approval-required path + permission-denied path.

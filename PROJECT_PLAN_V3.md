# PROJECT_PLAN_V3 — ERP Gap Analysis & Extended Requirements

**Audit Date:** 2026-04-15  
**Auditor:** Senior ERP Architect (Clowie)  
**Target Audience:** CFO + Technical Team  

## Overview
This document extends PROJECT_PLAN_V2 with a detailed gap analysis of the Arca ERP system. It examines each module's current implementation against standard ERP requirements, identifies missing functionality, and provides actionable user stories, acceptance criteria, API endpoints, frontend pages, priority, and complexity estimates.

---

## 1. Central Landing Page + Dashboard

### Gap Analysis
**Implemented:**
- Sidebar navigation
- 9 KPI cards (cash balance, burn rate, runway, AR overdue, AP due 7/30 days, gross margin, EBITDA proxy, budget consumption)
- Alerts panel (pending approvals, overdue AR, critical AP)
- Static dashboard layout with refresh button

**Missing (ERP Standard):**
1. **Date range picker for dashboard** – Cannot view KPIs for custom periods (MTD, QTD, YTD, custom).
2. **Customizable KPI widgets** – No drag‑and‑drop, show/hide, or rearrange of tiles.
3. **Export dashboard as PDF/image** – No ability to share dashboard snapshot.
4. **Scheduled dashboard email reports** – No automated delivery of daily/weekly executive summaries.
5. **Real‑time data refresh toggle** – Manual refresh only; no auto‑refresh (e.g., every 5 minutes).
6. **Compare to prior period** – No MoM, QoQ, YoY comparison views.
7. **Budget vs actual summary widget** – Missing high‑level budget variance tile.
8. **Cash flow forecast widget (30/60/90 day)** – No forward‑looking cash projection.
9. **Working capital indicators** – No current ratio, quick ratio, inventory days, receivables days, payables days.

### User Stories
1. As a CFO, I want to select a custom date range (e.g., last quarter, current fiscal year) so I can analyze KPIs for any period.
2. As a finance manager, I want to rearrange, hide, or add KPI tiles so the dashboard shows only the metrics I care about.
3. As an executive, I want to export the dashboard as a PDF to include in board packs or investor updates.
4. As a daily user, I want the dashboard to automatically refresh every 5 minutes so I always see the latest numbers without clicking Refresh.
5. As a CFO, I want to see each KPI compared to the same period last month/quarter/year to spot trends.
6. As a cash manager, I want a 90‑day cash forecast widget that projects cash balance based on scheduled invoices and payments.
7. As a working‑capital analyst, I want tiles showing days sales outstanding (DSO), days inventory outstanding (DIO), and days payables outstanding (DPO).

### Acceptance Criteria
1. Dashboard header includes date‑range picker with presets (Today, MTD, QTD, YTD, Last Month, Custom).
2. User can drag KPI tiles to reorder, click an “X” to hide, and restore hidden tiles from a settings panel.
3. “Export” button generates a PDF containing all visible KPI tiles, current date range, and a timestamp.
4. Configuration page allows setting up scheduled email reports (daily at 8 AM, weekly Monday 9 AM) with recipient list.
5. Toggle switch “Auto‑refresh” enables periodic data fetch (configurable interval: 1, 5, 15 minutes).
6. Each KPI tile shows a small delta indicator (+/- %) comparing the current value to the previous period.
7. Cash‑flow forecast widget uses invoice due dates, scheduled payments, and recurring patterns to project balances.
8. Working‑capital tiles compute DSO = (Average AR / Revenue) × days in period, DIO, DPO using ledger data.

### API Endpoints Needed
- `GET /api/v1/dashboard/kpis?from=YYYY-MM-DD&to=YYYY-MM-DD&compare=previous_period|same_period_last_year`
- `POST /api/v1/dashboard/widgets/layout` – save user’s widget arrangement
- `GET /api/v1/dashboard/export?format=pdf|png&from=&to=`
- `POST /api/v1/dashboard/schedules` – create/edit scheduled email reports
- `GET /api/v1/dashboard/cash-forecast?days=30|60|90`
- `GET /api/v1/dashboard/working-capital?as_of=YYYY-MM-DD`

### Frontend Pages Needed
- **Dashboard Settings Page** – widget customization, date‑range defaults, auto‑refresh toggle.
- **Report Scheduler Page** – create/edit/delete scheduled email reports.
- **Cash Forecast Page** – detailed cash projection with assumptions and drill‑down.

### Priority: P1 (should‑have)
**Rationale:** Dashboard is the primary executive interface; missing flexibility and export capabilities reduce its utility for decision‑making.

### Estimated Complexity: Medium
- Backend: new endpoints for custom date ranges, comparison logic, export generation, scheduling jobs.
- Frontend: drag‑and‑drop library, date‑picker component, export button, settings UI.

---

## 2. Contacts / Business Partners

### Gap Analysis
**Implemented:**
- Contact list (table view)
- Basic CRUD (create, read, update)
- Type classification (debtor/creditor)
- Document upload per contact

**Missing (ERP Standard):**
1. **Contact categories/groups** – No tags or groups (e.g., "Supplier", "Customer", "VIP").
2. **Contact bank details** – Missing IBAN, BIC, bank name, account holder.
3. **Payment terms per contact** – No net 30, net 60, end-of-month, cash-on-delivery.
4. **Credit limit per contact** – No credit limit with alerts when exceeded.
5. **Contact activity history** – No timeline of invoices, payments, communications.
6. **Document attachments per contact** – Currently only one document upload; no versioning or categorization.
7. **Contact merge/duplicate detection** – Cannot merge duplicate contact records.
8. **Tax ID / VAT number validation** – No validation against official VAT databases.
9. **Contact portal credentials** – No self‑service portal for customers/suppliers to view documents.
10. **Communication log** – No record of emails sent, calls, meetings.
11. **Dunning settings per contact** – No configurable dunning levels, grace periods, reminder templates.

### User Stories
1. As a credit controller, I want to set a credit limit for each customer and receive alerts when invoices exceed it.
2. As an accounts payable clerk, I want to store supplier bank details (IBAN, BIC) so I can generate SEPA files.
3. As a sales manager, I want to group customers by industry or region for targeted campaigns.
4. As a finance user, I want to see a timeline of all interactions with a contact (invoices, payments, emails) on one page.
5. As an admin, I want to merge duplicate contact records to keep the database clean.
6. As a VAT officer, I want the system to validate VAT numbers via the EU VIES service.
7. As a customer, I want a self‑service portal where I can view my invoices and payment status.
8. As a collections officer, I want a dunning workflow that automatically sends reminders based on overdue days.

### Acceptance Criteria
1. Contact form includes fields for IBAN, BIC, bank name, account holder; validation of IBAN format.
2. Contact detail page shows credit limit, current outstanding, and warning if limit exceeded.
3. Contact list can be filtered by tags/categories; bulk tagging supported.
4. Activity timeline displays chronological entries with links to related documents.
5. Merge tool allows selecting two contacts, choosing which data to keep, and merging all linked transactions.
6. VAT number field triggers validation via API; validation status and date stored.
7. Portal credentials can be generated per contact; login page for external users with restricted view.
8. Dunning settings configurable per contact: grace period, reminder intervals, email templates.

### API Endpoints Needed
- `GET /api/v1/contacts/:id/bank-details`
- `POST /api/v1/contacts/:id/bank-details`
- `GET /api/v1/contacts/:id/credit-limit`
- `POST /api/v1/contacts/:id/credit-limit`
- `GET /api/v1/contacts/:id/activity`
- `POST /api/v1/contacts/merge`
- `POST /api/v1/contacts/:id/validate-vat`
- `POST /api/v1/contacts/:id/portal-credentials`
- `GET /api/v1/contacts/:id/dunning-settings`
- `POST /api/v1/contacts/:id/dunning-settings`

### Frontend Pages Needed
- **Contact Detail Page** – expand to show tabs: Bank Details, Credit Limit, Activity Timeline, Documents, Dunning Settings.
- **Contact Merge Tool** – wizard for selecting and merging duplicates.
- **Contact Portal Login Page** – external-facing page for customers to log in and view their documents.
- **Contact Categories Manager** – UI for creating/deleting tags and assigning to contacts.

### Priority: P1 (should‑have)
**Rationale:** Contact master data is foundational for financial operations; missing bank details, credit limits, and VAT validation create manual work and risk.

### Estimated Complexity: Medium
- Backend: new tables (contact_bank_details, contact_tags, contact_activity, portal_credentials, dunning_settings).
- Frontend: additional tabs on existing contact page, new merge UI, external portal (separate subdomain).

---

## 3. Finance (Invoices, Payments, Journal Entries)

### Gap Analysis
**Implemented:**
- Invoice CRUD (create, list, get)
- Payment CRUD (create, list, get)
- Journal Entry CRUD (create, list, get)
- Business partner linking (contact_id, business_partner_id)
- Basic journal entries with debit/credit lines
- Profit & Loss report
- VAT report
- Open AR report
- Policy approval integration (spend approval, agent tasks)

**Missing (ERP Standard):**
1. **Recurring invoices** – No support for monthly/quarterly repeating invoices.
2. **Invoice templates / branded PDFs** – Invoices cannot be customized with company logo, layout, terms.
3. **Partial payments** – Cannot record partial payment against an invoice; only full payment.
4. **Payment terms** – No net 30, net 60, end‑of‑month, cash‑on‑delivery terms.
5. **Late payment penalties / interest** – No automatic calculation of late fees.
6. **Credit notes / invoice reversal** – No ability to issue credit notes or reverse invoices.
7. **Invoice approval workflow** – No multi‑step approval for invoices (only spend approval for agents).
8. **SEPA / wire transfer file export** – Cannot generate SEPA XML or CSV for bank payments.
9. **VAT reporting (monthly/quarterly)** – No formatted VAT return reports per tax authority.
10. **Intrastat reporting** – Missing intra‑EU trade statistics reports.
11. **Cost center allocation per line item** – Journal entries cannot allocate amounts to cost centers.
12. **Multi‑company support** – All transactions are in a single company; no consolidation.
13. **Fiscal period locking** – No ability to lock closed periods to prevent accidental postings.

### User Stories
1. As a subscription business, I want to set up recurring invoices that generate automatically each month.
2. As a finance user, I want to apply a partial payment to an invoice and track the remaining balance.
3. As a credit controller, I want to configure payment terms per customer and see due dates on invoices.
4. As a collections officer, I want the system to calculate late‑payment interest based on overdue days and configured rates.
5. As an accountant, I want to issue a credit note for a returned product and link it to the original invoice.
6. As a CFO, I want to approve invoices over €10,000 before they are posted to the ledger.
7. As an accounts payable clerk, I want to export a SEPA XML file with all approved payments to upload to my bank.
8. As a tax accountant, I want to generate a VAT return report for Q1 2026 with totals per VAT rate.
9. As a multi‑entity group, I want to post transactions to different legal entities and produce consolidated statements.
10. As a month‑end closer, I want to lock the fiscal period January 2026 to prevent accidental changes.

### Acceptance Criteria
1. Recurring invoice configuration: start date, frequency (monthly, quarterly), end date, template.
2. Invoice PDF generated with company logo, address, terms & conditions, line items, totals.
3. Payment screen allows entering partial amount; invoice status changes to "partially paid" and shows remaining balance.
4. Invoice form includes payment term dropdown; due date auto‑calculated based on term.
5. Late‑interest calculation runs nightly, creates interest invoice line, and posts to ledger.
6. Credit note can reference an existing invoice; reduces AR balance and posts contra revenue.
7. Invoice approval workflow: configurable approval chains (e.g., manager → finance → CFO).
8. SEPA export generates valid XML (pain.001) with creditor IBAN, BIC, and payment references.
9. VAT report shows taxable sales/purchases per VAT rate, total VAT due/recoverable.
10. Intrastat report lists cross‑border shipments with commodity codes, value, weight.
11. Journal entry line items include optional cost center field; reports can group by cost center.
12. Each transaction includes a company_id; consolidation engine merges balances across companies.
13. Period‑locking screen: select period (YYYY‑MM) and lock; locked periods reject new transactions.

### API Endpoints Needed
- `POST /api/v1/invoices/recurring` – create recurring invoice template
- `GET /api/v1/invoices/recurring` – list active recurring invoices
- `POST /api/v1/invoices/:id/partial-payment` – record partial payment
- `GET /api/v1/invoices/:id/payment-schedule` – show payment schedule with terms
- `POST /api/v1/credit-notes` – create credit note
- `POST /api/v1/invoices/:id/approve` – submit for approval (if workflow enabled)
- `GET /api/v1/payments/sepa-export?from=&to=` – generate SEPA XML
- `GET /api/v1/reports/vat-return?period=2026-Q1` – VAT return report
- `GET /api/v1/reports/intrastat?year=2026&month=1` – Intrastat report
- `POST /api/v1/journal-entries` – extend with cost_center field
- `POST /api/v1/companies` – multi‑company CRUD
- `POST /api/v1/periods/:year-:month/lock` – lock fiscal period

### Frontend Pages Needed
- **Recurring Invoices Page** – list, create, edit, pause recurring invoices.
- **Invoice Template Designer** – WYSIWYG editor for invoice PDF layout.
- **Partial Payment Dialog** – modal to enter partial payment amount and date.
- **Payment Terms Configuration** – manage terms (net 30, net 60, etc.).
- **Credit Notes Page** – create and list credit notes.
- **Invoice Approval Workflow** – screen for approving/rejecting pending invoices.
- **SEPA Export Page** – select payments, generate and download XML.
- **VAT Return Page** – period selector, review VAT totals, submit to tax authority.
- **Multi‑Company Switcher** – dropdown to switch company context.
- **Period Locking Page** – list periods, lock/unlock.

### Priority: P0 (must‑have)
**Rationale:** Core financial operations require payment terms, partial payments, credit notes, VAT reporting, and period locking for audit compliance.

### Estimated Complexity: High
- Backend: new tables (recurring_invoices, invoice_templates, credit_notes, payment_terms, late_interest_rules, sepa_files, vat_returns, intrastat_declarations, companies, period_locks).
- Frontend: many new pages and complex UI (invoice designer, approval workflow).

---

## 4. Projects

### Gap Analysis
**Implemented:**
- Project CRUD (create, list)
- Sprints (create, list)
- User stories (create, list, status update)
- Token budget tracking (estimated vs actual tokens)
- Burndown chart for sprints

**Missing (ERP Standard):**
1. **Project templates** – Cannot duplicate a project structure (sprints, stories, budgets).
2. **Task dependencies (Gantt‑style)** – No predecessor/successor relationships; no critical path.
3. **Milestone tracking** – No milestones with target dates and deliverables.
4. **Time tracking per task** – Cannot record hours spent on stories/tasks.
5. **Resource allocation / capacity planning** – No view of team member availability vs assigned work.
6. **Project billing (time & materials, fixed price)** – No link between project work and customer invoices.
7. **Project profitability report** – Cannot compare project revenue vs cost (labor, expenses).
8. **Change order handling** – No formal process for scope changes with approval and budget impact.
9. **Project status workflow** – No defined states (draft → active → on‑hold → completed → archived).
10. **Budget version management** – Cannot create budget revisions and compare versions.
11. **Utilization reporting** – No report showing team member utilization (% of capacity used).

### User Stories
1. As a project manager, I want to create a project from a template (e.g., "Software Development") to save setup time.
2. As a planner, I want to define task dependencies so the schedule automatically adjusts when a task is delayed.
3. As a stakeholder, I want to see key milestones (e.g., "MVP Launch") on a timeline with status indicators.
4. As a team member, I want to log hours against a user story so we can track actual effort vs estimate.
5. As a resource manager, I want to see each team member's weekly capacity and assigned hours to avoid over‑allocation.
6. As a project accountant, I want to generate an invoice from a project based on logged hours and agreed rates.
7. As a CFO, I want a profitability report per project showing revenue, cost, margin, and margin %.
8. As a client, I want to request a change order that goes through approval and updates project budget.
9. As a PMO, I want to see all projects in a portfolio view with status (green/yellow/red).
10. As a controller, I want to compare original budget vs revised budget and see variance explanations.
11. As a department head, I want a utilization report showing which employees are under/over utilized.

### Acceptance Criteria
1. Project template includes predefined sprints, story templates, budget categories, and approval workflows.
2. Task dependency UI allows linking tasks (FS, SS, FF, SF); schedule recalculates when dates change.
3. Milestone table with name, due date, owner, status (planned, at risk, achieved).
4. Time entry form: select project, story, date, hours, description; hours roll up to story and project.
5. Resource planning view: weekly calendar showing each person's allocated hours vs capacity (e.g., 40h/week).
6. Billing rules: time‑and‑materials (hourly rate × logged hours) or fixed‑price (milestone‑based).
7. Profitability report: project revenue (invoiced), cost (labor cost + expenses), margin, margin %.
8. Change order form: description, impact on schedule/budget, approval workflow, audit trail.
9. Project status can be changed via workflow; each status triggers notifications and permissions.
10. Budget versioning: each version stores budget lines, dates, and revision comments.
11. Utilization report: for each employee, shows billable vs non‑billable hours, capacity, utilization %.

### API Endpoints Needed
- `POST /api/v1/projects/templates` – create project template
- `GET /api/v1/projects/templates` – list templates
- `POST /api/v1/projects/:id/tasks/dependencies` – add task dependency
- `GET /api/v1/projects/:id/gantt` – Gantt chart data
- `POST /api/v1/projects/:id/milestones` – create milestone
- `POST /api/v1/time-entries` – log hours
- `GET /api/v1/projects/:id/resource-allocation` – resource allocation view
- `POST /api/v1/projects/:id/invoice` – generate invoice from project
- `GET /api/v1/projects/:id/profitability` – profitability report
- `POST /api/v1/projects/:id/change-orders` – create change order
- `GET /api/v1/projects/portfolio` – portfolio status dashboard
- `POST /api/v1/projects/:id/budget-versions` – create new budget version
- `GET /api/v1/reports/utilization?from=&to=` – utilization report

### Frontend Pages Needed
- **Project Templates Page** – manage templates.
- **Gantt Chart Page** – interactive Gantt with dependencies.
- **Milestones Page** – list milestones with status.
- **Time Tracking Page** – weekly timesheet entry.
- **Resource Planning Page** – visual capacity planning.
- **Project Billing Page** – configure billing rules, generate invoices.
- **Project Profitability Page** – revenue/cost/margin dashboard.
- **Change Orders Page** – list and approve change orders.
- **Project Portfolio Page** – high‑level view of all projects.
- **Budget Versions Page** – compare budget versions.
- **Utilization Report Page** – team utilization dashboard.

### Priority: P1 (should‑have)
**Rationale:** Project management is a core ERP capability for professional services; missing time tracking, billing, and profitability reporting limits business insight.

### Estimated Complexity: High
- Backend: new tables (project_templates, task_dependencies, milestones, time_entries, resource_allocations, billing_rules, change_orders, budget_versions).
- Frontend: complex interactive pages (Gantt, resource planning, timesheets).

---

## 5. Inventory

### Gap Analysis
**Implemented:**
- Items CRUD (SKU, name, description, UoM, valuation method, reorder threshold, preferred supplier)
- Goods receipt (RECEIPT), issue (ISSUE), adjustment (ADJUSTMENT)
- FIFO/AVERAGE valuation
- Inventory valuation report (as of date)
- Movement history

**Missing (ERP Standard):**
1. **Multi‑warehouse support** – All stock is in a single virtual warehouse; no location tracking.
2. **Serial number / lot tracking** – Cannot track individual serial numbers or production batches.
3. **Shelf life / expiration tracking** – No expiry dates for perishable items.
4. **Barcode / QR code generation** – No barcode printing or scanning integration.
5. **Reorder point automation** – No automatic purchase order generation when stock falls below reorder threshold.
6. **Vendor lead times** – No lead‑time data per supplier to improve reorder timing.
7. **Inventory forecasting (demand planning)** – No statistical forecasting based on historical demand.
8. **Stock count reconciliation (cycle counting)** – No process for physical count vs system count reconciliation.
9. **Landed cost calculation** – Cannot allocate freight, duties, insurance to item cost.
10. **Bill of materials (BOM) / kit items** – Cannot define a product composed of sub‑components.
11. **Drop‑ship support** – No special handling for orders shipped directly from supplier to customer.
12. **Reserved stock vs available stock** – Cannot reserve stock for a sales order; only on‑hand quantity.

### User Stories
1. As a warehouse manager, I want to track inventory across multiple locations (e.g., Main Warehouse, Shelf A1).
2. As a pharmaceutical distributor, I need to track each batch number and expiry date for recall purposes.
3. As a food retailer, I want to be alerted when items are approaching their expiry date.
4. As a picker, I want to scan barcodes to confirm receipts and issues.
5. As a purchasing manager, I want the system to automatically create a purchase order when stock falls below the reorder point.
6. As a planner, I want to see supplier lead times to schedule orders earlier.
7. As a demand planner, I want a forecast of future demand based on historical sales patterns.
8. As a cycle counter, I want a mobile‑friendly interface to count physical stock and reconcile variances.
9. As an import manager, I want to allocate freight costs to individual items to calculate accurate landed cost.
10. As a manufacturer, I want to define a BOM for a finished good and explode it into component requirements.
11. As a drop‑ship coordinator, I want to create a sales order that triggers a purchase order to the supplier with ship‑to customer address.
12. As a salesperson, I want to reserve stock for a pending order so it is not sold to another customer.

### Acceptance Criteria
1. Each inventory movement records warehouse/location; stock levels are per location; transfers between locations.
2. Serial number table links serial to item, current location, status (in stock, sold, scrapped).
3. Item master includes optional expiry date field; reports show items expiring within X days.
4. Barcode generation per SKU/lot; printable label; scanning API to lookup item.
5. Reorder point automation runs nightly; generates draft PO with suggested quantities.
6. Supplier record includes lead time (days); PO suggested date = needed date – lead time.
7. Forecasting engine uses moving average, seasonal adjustment; projects demand for next 30/60/90 days.
8. Cycle counting: select items, enter physical count, system calculates variance, posts adjustment with reason.
9. Landed cost allocation: allocate freight/duties to receipt lines; adjust item cost accordingly.
10. BOM definition: parent item, child items, quantities, optional sub‑assemblies.
11. Drop‑ship workflow: sales order creates PO to supplier with customer shipping address; PO marked as drop‑ship.
12. Stock reservation: sales order line can reserve quantity; reserved quantity deducted from available stock.

### API Endpoints Needed
- `POST /api/v1/inventory/warehouses` – create warehouse
- `GET /api/v1/inventory/warehouses` – list warehouses
- `POST /api/v1/inventory/items/:id/serials` – add serial numbers
- `GET /api/v1/inventory/items/expiring?within_days=30` – expiry report
- `GET /api/v1/inventory/items/:id/barcode` – generate barcode image
- `POST /api/v1/inventory/reorder-points/run` – trigger reorder automation
- `POST /api/v1/inventory/forecast` – generate demand forecast
- `POST /api/v1/inventory/cycle-counts` – create cycle count
- `POST /api/v1/inventory/receipts/:id/allocate-landed-cost` – allocate landed cost
- `POST /api/v1/inventory/boms` – create BOM
- `POST /api/v1/inventory/drop-ship-orders` – create drop‑ship order
- `POST /api/v1/inventory/reservations` – reserve stock

### Frontend Pages Needed
- **Warehouse Management Page** – list warehouses, locations, stock by location.
- **Serial/Lot Tracking Page** – search serials, view history.
- **Expiry Management Page** – items nearing expiry, alerts.
- **Barcode Label Printing** – design and print labels.
- **Reorder Automation Page** – review suggested POs, approve.
- **Demand Forecasting Page** – view forecast charts, adjust parameters.
- **Cycle Counting Page** – mobile‑friendly count entry.
- **Landed Cost Allocation Page** – allocate costs to receipt lines.
- **BOM Manager** – create/edit BOMs, explode requirements.
- **Drop‑Ship Order Page** – create drop‑ship sales order.
- **Stock Reservation Page** – reserve/unreserve stock for orders.

### Priority: P1 (should‑have)
**Rationale:** Inventory is a major asset; missing warehouse, serial, and BOM capabilities limits operational control and scalability.

### Estimated Complexity: High
- Backend: new tables (warehouses, serial_numbers, expiry_dates, barcodes, reorder_automation_rules, supplier_lead_times, demand_forecasts, cycle_counts, landed_cost_allocations, boms, drop_ship_orders, stock_reservations).
- Frontend: many new pages, mobile UI for counting, barcode scanning integration.

---

## 6. Reports

### Gap Analysis
**Implemented:**
- Cash flow statement (direct/indirect)
- Budget vs actual (by department/project/cost center)
- AR aging (current, 1–30, 31–60, 61–90, 90+ days)
- AP aging (same buckets)
- CSV export for all reports

**Missing (ERP Standard):**
1. **All statutory reports** – Income statement (P&L), balance sheet, cash flow statement (formal).
2. **Consolidated reporting** – Cannot combine multiple legal entities into group statements.
3. **Custom report builder** – No drag‑and‑drop interface to create ad‑hoc reports.
4. **Report scheduling** – Cannot email reports automatically on a schedule.
5. **Comparative statements** – No side‑by‑side comparison with prior period or budget.
6. **Ratio analysis** – No liquidity, profitability, solvency, efficiency ratios.
7. **Budget forecasting / what‑if scenarios** – Cannot project future balances based on assumptions.
8. **Audit log report** – No centralized report of who changed what, when.
9. **Tax reporting package** – No pre‑configured reports for local tax authorities.
10. **Board pack / investor reporting** – No formatted presentation‑ready PDF with charts and commentary.

### User Stories
1. As a CFO, I need a complete set of statutory financial statements (P&L, balance sheet, cash flow) for the annual audit.
2. As a group controller, I want to produce consolidated financials for three subsidiaries with intercompany eliminations.
3. As a business analyst, I want to build a custom report by selecting columns, filters, and grouping without writing SQL.
4. As a department head, I want to receive a weekly budget vs actual report by email every Monday morning.
5. As a financial planner, I want to compare this quarter's P&L to the same quarter last year.
6. As a credit analyst, I want to see key ratios (current ratio, debt‑to‑equity, ROE) for a customer.
7. As a CFO, I want to run a what‑if scenario: "What if sales grow 10% and costs increase 5%?"
8. As an auditor, I want a report of all changes to master data (contacts, items, accounts) in the last month.
9. As a tax accountant, I want a tax reporting package that includes VAT, payroll taxes, and corporate income tax worksheets.
10. As a board member, I want a board pack with executive summary, financial highlights, charts, and appendix tables.

### Acceptance Criteria
1. Income statement shows revenue, COGS, gross profit, operating expenses, net profit, formatted per GAAP/IFRS.
2. Balance sheet shows assets, liabilities, equity; balances tie to ledger.
3. Consolidation engine eliminates intercompany transactions and balances.
4. Custom report builder: select tables, fields, filters, grouping, sorting; preview results; save as new report.
5. Schedule configuration: report, frequency (daily, weekly, monthly), recipient list, output format (PDF, Excel).
6. Comparative statements show two periods side‑by‑side with absolute and percentage variance.
7. Ratio library includes pre‑defined ratios (liquidity, profitability, leverage, activity) with formulas.
8. What‑if modeling: adjust assumptions (growth rates, cost ratios) and see projected P&L and balance sheet.
9. Audit log report: table of changes with timestamp, user, entity, field, old value, new value.
10. Tax reporting package includes jurisdiction‑specific templates (e.g., German VAT return, US 1120).
11. Board pack generator: select time period, include executive summary, KPI charts, financial tables, comments.

### API Endpoints Needed
- `GET /api/v1/reports/income-statement?from=&to=` – income statement
- `GET /api/v1/reports/balance-sheet?as_of=YYYY-MM-DD` – balance sheet
- `GET /api/v1/reports/consolidated?from=&to=&company_ids=1,2,3` – consolidated statements
- `POST /api/v1/reports/custom` – create custom report definition
- `GET /api/v1/reports/custom/:id/run` – run custom report
- `POST /api/v1/reports/schedules` – schedule report email
- `GET /api/v1/reports/comparative?period=2026-Q1&compare_to=2025-Q1` – comparative report
- `GET /api/v1/reports/ratios?as_of=YYYY-MM-DD` – ratio analysis
- `POST /api/v1/reports/what-if` – run what‑if scenario
- `GET /api/v1/reports/audit-log?from=&to=&entity=contacts` – audit log report
- `GET /api/v1/reports/tax/:jurisdiction/:type?period=2026-Q1` – tax report
- `GET /api/v1/reports/board-pack?period=2026-Q1` – board pack PDF

### Frontend Pages Needed
- **Financial Statements Page** – tabs for P&L, balance sheet, cash flow.
- **Consolidation Page** – select entities, run consolidation, view eliminations.
- **Custom Report Builder** – drag‑drop UI for creating reports.
- **Report Scheduler Page** – manage scheduled reports.
- **Comparative Analysis Page** – side‑by‑side comparison.
- **Ratio Dashboard** – ratio charts with benchmarks.
- **What‑If Modeling Page** – input assumptions, see projected financials.
- **Audit Log Page** – filterable log of changes.
- **Tax Reporting Page** – jurisdiction‑specific tax forms.
- **Board Pack Generator** – configure and generate board pack.

### Priority: P0 (must‑have)
**Rationale:** Statutory reporting and consolidation are legal requirements; missing these makes the ERP unusable for official financial statements.

### Estimated Complexity: High
- Backend: complex consolidation logic, custom report engine, scheduling system, what‑if modeling, audit log aggregation.
- Frontend: heavy UI for report builder, financial statement layouts, interactive modeling.

---

## 7. Multi‑Currency (FX)

### Gap Analysis
**Implemented:**
- FX rate CRUD (create, update, list)
- Revaluation job (manual trigger)
- Exposure report (net open positions per currency)

**Missing (ERP Standard):**
1. **Live exchange rate feed** – No automatic import from ECB, fixer.io, or other providers.
2. **Forward contracts / hedging tracking** – Cannot record forward contracts and match them with future transactions.
3. **FX gain/loss automatic posting** – Realized and unrealized FX gains/losses are not automatically posted to the ledger.
4. **Transaction currency vs reporting currency per report** – Reports always in base currency; cannot view in transaction currency.
5. **Per‑contact default currency** – Contacts do not have a default currency; each transaction must specify currency.
6. **Bank accounts in foreign currency** – Bank accounts are assumed to be in base currency; no foreign‑currency bank accounts.
7. **Recurring revaluation automation** – No scheduled job to revalue open items at period‑end.

### User Stories
1. As a treasurer, I want daily exchange rates automatically imported from ECB so I don't have to manually enter rates.
2. As a hedging manager, I want to record a forward contract for USD 100,000 at 0.92 EUR/USD and track its settlement.
3. As an accountant, I want the system to automatically post realized FX gains/losses when a foreign‑currency payment clears.
4. As a regional manager, I want to view the AR aging report in USD even though our base currency is EUR.
5. As a sales manager, I want to set a customer's default currency to USD so all invoices to them default to USD.
6. As a cash manager, I want to open a USD bank account and see its balance in USD and EUR equivalent.
7. As a month‑end closer, I want a scheduled job that revalues all open foreign‑currency items on the last day of the month.

### Acceptance Criteria
1. Exchange rate feed: configurable source (ECB, fixer.io), automatic daily import, manual override possible.
2. Forward contract record: notional amount, currency pair, forward rate, maturity date, settlement status.
3. Realized FX gain/loss automatically posted when a foreign‑currency transaction is fully settled (payment vs invoice).
4. All reports accept a `currency` parameter; if transaction currency differs, convert using appropriate rate.
5. Contact record includes default_currency field; invoice/payment defaults to that currency.
6. Bank account entity includes currency field; balance shown in both transaction and base currency.
7. Scheduled revaluation job runs at configurable intervals (daily, weekly, monthly) and posts unrealized gains/losses.

### API Endpoints Needed
- `POST /api/v1/fx/feeds/sync` – trigger exchange rate feed sync
- `GET /api/v1/fx/feeds/sources` – list available sources
- `POST /api/v1/fx/forward-contracts` – create forward contract
- `GET /api/v1/fx/forward-contracts` – list forward contracts
- `POST /api/v1/fx/auto-post-gain-loss` – run automatic gain/loss posting
- `GET /api/v1/reports/:report_id?currency=USD` – report in specified currency
- `PATCH /api/v1/contacts/:id` – add default_currency field
- `POST /api/v1/bank-accounts` – create bank account with currency
- `POST /api/v1/fx/revalue/schedule` – configure revaluation schedule

### Frontend Pages Needed
- **Exchange Rate Feed Page** – configure sources, view imported rates, manual overrides.
- **Forward Contracts Page** – list, create, settle forward contracts.
- **FX Gain/Loss Report Page** – view realized and unrealized gains/losses.
- **Multi‑Currency Report Viewer** – dropdown to select report currency.
- **Contact Currency Settings** – set default currency per contact.
- **Bank Accounts Page** – add/edit bank accounts with currency.
- **Revaluation Scheduler Page** – configure automatic revaluation jobs.

### Priority: P1 (should‑have)
**Rationale:** Multi‑currency operations are common; missing live rates, forward contracts, and automatic gain/loss posting creates manual work and financial risk.

### Estimated Complexity: Medium
- Backend: integration with external rate APIs, forward contract tracking, automatic posting logic, currency‑aware reporting.
- Frontend: new pages for forward contracts and rate feeds.

---

## 8. Approval Workflows

### Gap Analysis
**Implemented:**
- Approval policy CRUD (scope, threshold, approver)
- Request approve/reject
- Audit trail of decisions
- Integration with finance module (spend approval for agents)

**Missing (ERP Standard):**
1. **Multi‑step approval chains** – No support for manager → CFO → board sequential approvals.
2. **Delegation of approval authority** – Cannot delegate approvals to another user when absent.
3. **SLA alerts for pending approvals** – No notifications when approvals are pending beyond a time limit.
4. **Mobile push notifications for approvals** – Approvers cannot approve via mobile push.
5. **Bulk approve / reject** – Cannot approve multiple requests at once.
6. **Approval escalation rules** – No automatic escalation to a higher authority after X hours.
7. **Approval request comments / notes** – No ability for approver to add comments to their decision.
8. **Conditional routing** – Routing cannot depend on amount, cost center, project, or other attributes.
9. **Pre‑approval budget check** – Cannot check budget availability before allowing approval.
10. **Post‑approval auto‑posting to ledger** – Approved transactions are not automatically posted; manual posting required.

### User Stories
1. As a CFO, I want a two‑step approval for invoices over €50,000 (first manager, then CFO).
2. As a manager going on vacation, I want to delegate my approval authority to my deputy for a week.
3. As a finance controller, I want to receive an alert if an approval has been pending for more than 48 hours.
4. As an approver, I want to receive a push notification on my phone so I can approve quickly.
5. As an accounts payable clerk, I want to select 20 invoices and approve them all with one click.
6. As a process owner, I want an approval to escalate to the next level if not actioned within 24 hours.
7. As an approver, I want to add a comment "Please check with legal" when rejecting a request.
8. As a configurator, I want to route approvals based on cost center (e.g., marketing > €10k goes to CMO).
9. As a budget owner, I want the system to check budget availability before allowing approval; if insufficient, block approval.
10. As a finance user, I want approved invoices to be automatically posted to the ledger without manual intervention.

### Acceptance Criteria
1. Approval chain configurable as a sequence of roles/users; each step must be completed before moving to next.
2. Delegation interface: select delegate, start/end date, scope (all approvals or specific policies).
3. SLA alerts: configurable threshold per policy; email/notification when exceeded.
4. Mobile push: integration with mobile app or Telegram/WhatsApp bot for approval notifications.
5. Bulk approve: select multiple requests, click "Approve All", confirm.
6. Escalation rules: after X hours, automatically reassign to next higher authority.
7. Comment field mandatory on reject; optional on approve; stored in audit trail.
8. Conditional routing: policy can include rules based on amount, cost center, project, department.
9. Budget check: before approval, system verifies sufficient budget in relevant cost center/project; if not, approval blocked with warning.
10. Auto‑posting: after final approval, transaction automatically posts to ledger (status changes from waiting_approval to posted).

### API Endpoints Needed
- `POST /api/v1/approvals/chains` – create multi‑step approval chain
- `POST /api/v1/approvals/delegations` – delegate approval authority
- `GET /api/v1/approvals/pending/sla-alerts` – list overdue approvals
- `POST /api/v1/approvals/notifications/push` – send push notification
- `POST /api/v1/approvals/bulk` – bulk approve/reject
- `POST /api/v1/approvals/escalations` – configure escalation rules
- `POST /api/v1/approvals/requests/:id/comment` – add comment
- `POST /api/v1/approvals/policies/conditional` – create conditional routing policy
- `GET /api/v1/approvals/requests/:id/budget-check` – pre‑approval budget check
- `POST /api/v1/approvals/requests/:id/auto-post` – auto‑post after approval

### Frontend Pages Needed
- **Approval Chain Designer** – visual editor for multi‑step approval chains.
- **Delegation Management Page** – set up delegations.
- **SLA Alerts Page** – view overdue approvals, configure thresholds.
- **Mobile Approval App** – dedicated mobile interface for approvals.
- **Bulk Approval Page** – select multiple requests, approve/reject.
- **Escalation Rules Page** – configure escalation timers and hierarchy.
- **Approval Comments Modal** – add/view comments per request.
- **Conditional Routing Editor** – rule‑based policy builder.
- **Budget Check Page** – visualize budget availability before approval.
- **Auto‑Posting Configuration** – toggle auto‑posting per transaction type.

### Priority: P1 (should‑have)
**Rationale:** Approval workflows are critical for internal controls; missing multi‑step, delegation, and escalation reduces governance and creates bottlenecks.

### Estimated Complexity: Medium
- Backend: complex state machine for multi‑step chains, delegation logic, escalation timers, budget checks, auto‑posting.
- Frontend: approval chain designer, bulk UI, mobile app.

---

## 9. HR Module (NEW – Entirely Missing)

### Gap Analysis
**Implemented:**
- *Nothing* – HR module does not exist.

**Required (ERP Standard):**
1. **Employee records** – Personal info, employment contract, salary, role, department, manager.
2. **Organizational structure** – Org chart with reporting lines, departments, teams.
3. **Leave management** – Vacation, sick leave, parental leave, overtime, balance tracking.
4. **Time tracking** – Clock in/out, timesheets, approvals, project/task allocation.
5. **Payroll preparation** – Salary components, deductions, net pay calculation, pay slips.
6. **Expense management** – Employee expenses with receipt upload, approval flow, reimbursement.
7. **Employee documents** – Contract, ID, certificates, performance reviews stored securely.
8. **Performance reviews** – Goals, feedback, ratings, performance cycles.
9. **Onboarding / offboarding checklists** – Automated task lists for HR and IT.
10. **HR dashboard** – Headcount, turnover, leave balance, salary analytics.

### User Stories
1. As an HR manager, I want to maintain a complete employee record with personal details, contract, salary, and reporting line.
2. As a CEO, I want to visualize the organizational chart to understand reporting structures.
3. As an employee, I want to request vacation and see my remaining leave balance.
4. As a team lead, I want to approve timesheets and leave requests for my team.
5. As a payroll clerk, I want to generate monthly pay slips with correct tax and deduction calculations.
6. As an employee, I want to submit an expense report with receipts and track reimbursement status.
7. As an HR admin, I want to store employee documents (contract, ID) in a secure digital folder.
8. As a manager, I want to conduct performance reviews with predefined goals and rating scales.
9. As an onboarding specialist, I want a checklist of tasks (IT setup, access, training) for new hires.
10. As an HR analyst, I want a dashboard showing headcount by department, turnover rate, and leave trends.

### Acceptance Criteria
1. Employee master table includes personal details, employment dates, salary, role, department, manager_id.
2. Org chart API returns hierarchical tree; UI displays interactive org chart.
3. Leave types configurable (vacation, sick, etc.); balances tracked; requests via workflow.
4. Time tracking: clock in/out via web/mobile; timesheet with daily entries; approval workflow.
5. Payroll: salary components (base, bonus, allowances), deductions (tax, insurance), net pay; generate pay slips PDF.
6. Expense management: submit expense lines with receipt attachment; approval workflow; reimbursement via payment integration.
7. Document storage: each employee has a document folder; upload/download with permissions.
8. Performance reviews: goal setting, feedback collection, rating scales, review cycles.
9. Onboarding/offboarding: checklist templates; assign tasks to HR/IT/managers; track completion.
10. HR dashboard: key metrics (headcount, turnover, leave balance, salary distribution).

### API Endpoints Needed
- `POST /api/v1/hr/employees` – create employee record
- `GET /api/v1/hr/employees` – list employees
- `GET /api/v1/hr/org-chart` – organizational hierarchy
- `POST /api/v1/hr/leave-requests` – request leave
- `GET /api/v1/hr/leave-balances` – leave balances
- `POST /api/v1/hr/time-entries` – clock in/out
- `POST /api/v1/hr/timesheets` – submit timesheet
- `POST /api/v1/hr/payroll/calculate` – calculate payroll
- `GET /api/v1/hr/payroll/payslips` – generate pay slips
- `POST /api/v1/hr/expenses` – submit expense report
- `POST /api/v1/hr/documents` – upload employee document
- `POST /api/v1/hr/performance-reviews` – create performance review
- `POST /api/v1/hr/onboarding/:employee_id/checklist` – start onboarding checklist
- `GET /api/v1/hr/dashboard` – HR dashboard metrics

### Frontend Pages Needed
- **Employee Directory Page** – list employees, search, filter.
- **Employee Detail Page** – full employee record with tabs: Personal, Employment, Salary, Documents.
- **Org Chart Page** – interactive org chart visualization.
- **Leave Management Page** – request leave, view calendar, approve requests.
- **Time Tracking Page** – clock in/out, weekly timesheet, approvals.
- **Payroll Preparation Page** – run payroll, review calculations, generate pay slips.
- **Expense Management Page** – submit expenses, track reimbursement.
- **Document Vault** – secure document storage per employee.
- **Performance Reviews Page** – set goals, conduct reviews, view history.
- **Onboarding/Offboarding Page** – checklist management, task tracking.
- **HR Dashboard Page** – metrics, charts, alerts.

### Priority: P2 (nice‑to‑have)
**Rationale:** HR is a separate domain; many ERP systems offer HR modules but it's not a core financial requirement. Can be phased later.

### Estimated Complexity: High
- Backend: many new tables (employees, org_structure, leave_requests, time_entries, payroll_calculations, expenses, documents, performance_reviews, onboarding_tasks).
- Frontend: extensive UI for employee management, time tracking, payroll, etc.

---

## Cross-Cutting Concerns

### Audit
**Current State:** Basic audit trail for approvals; missing comprehensive change tracking across all modules.
**Requirements:**
- Every mutation (create/update/delete) on master data (contacts, items, accounts, employees) must log before/after values, timestamp, user, and IP.
- Audit logs must be immutable (append‑only) and searchable by entity type, entity ID, user, date range.
- GDPR compliance: ability to export/delete personal data on request.
**Implementation:**
- Create central `audit_log` table with columns: `id`, `timestamp`, `user_id`, `user_type`, `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `ip_address`.
- Integrate audit middleware into all POST/PATCH/DELETE routes.
- Provide audit report UI for compliance officers.

### Authentication & Authorization
**Current State:** Scope‑based authorization (`*:read`, `*:write`, `*:approve`) with role checks.
**Requirements:**
- Fine‑grained permissions per module (e.g., `finance:invoice:create`, `inventory:item:update`).
- Role‑based access control (RBAC) with predefined roles (Viewer, Editor, Approver, Admin).
- Support for delegation of authority (temporary role assignment).
- Multi‑factor authentication (MFA) for sensitive operations.
**Implementation:**
- Extend `requireScopes` middleware to support hierarchical permissions.
- Create `roles` and `user_roles` tables.
- Add MFA setup flow (TOTP via authenticator app).

### Data Export & Import
**Current State:** CSV export for reports only.
**Requirements:**
- Full data export in standard formats (CSV, JSON, XBRL) for audit, migration, or external analysis.
- Bulk import of master data (contacts, items, chart of accounts) via CSV templates.
- Idempotent import with validation, preview, and error reporting.
- API for third‑party integrations (ERP‑to‑bank, ERP‑to‑CRM).
**Implementation:**
- Generic export service that can serialize any entity list to CSV/JSON.
- Import wizard with validation rules, mapping UI, and rollback on failure.
- Webhooks for real‑time sync with external systems.

### Notifications
**Current State:** Basic email notifications for approvals.
**Requirements:**
- Configurable notification channels: email, mobile push, Telegram, Slack, in‑app alerts.
- Notification templates with placeholders (e.g., `{{invoice_number}}`, `{{due_date}}`).
- User preference center: choose which events to be notified about.
- Escalation notifications for overdue approvals or critical alerts.
**Implementation:**
- Notification service with pluggable providers (SMTP, Telegram bot, Slack webhook).
- `notification_templates` table for customizable messages.
- `user_notification_preferences` table for opt‑in/opt‑out.

---

## Integration Points

### Internal Integrations
1. **Contacts → Finance:** Contact bank details used for SEPA payment export; credit limit blocks invoice creation.
2. **Inventory → Finance:** Inventory movements post COGS to GL; landed cost updates item valuation.
3. **Projects → Finance:** Time tracking generates project invoices; project profitability report pulls financial data.
4. **Approvals → All Modules:** Approval policies can be attached to invoices, payments, inventory adjustments, expense reports, leave requests.
5. **FX → Finance:** FX rates applied to foreign‑currency transactions; revaluation affects P&L.
6. **HR → Finance:** Payroll calculations post salary expenses to GL; employee expense reimbursements flow through AP.

### External Integrations
1. **Banking:** SEPA XML export for payments; bank statement import (CAMT.053) for reconciliation.
2. **Tax Authorities:** VAT reporting via ELSTER (Germany), SAF‑T (Norway), etc.
3. **E‑Commerce:** Sync orders from Shopify/WooCommerce; generate invoices automatically.
4. **CRM:** Bidirectional sync with HubSpot/Salesforce for customer data.
5. **Accounting:** Export to DATEV, QuickBooks, Xero.
6. **Payroll:** Integration with external payroll providers (e.g., ADP, Gusto).
7. **Document Management:** NextCloud integration for document storage (already implemented).

---

## Migration Strategy

### Database Changes
1. **Add new tables** for each missing feature (see each module's complexity section). Use incremental migrations (e.g., `202504150000_add_contact_bank_details.sql`).
2. **Alter existing tables** where needed (e.g., add `default_currency` to `contacts`, add `cost_center` to `journal_entry_lines`).
3. **Data migrations:**
   - Populate new columns with default values where nullable.
   - Backfill historical data where possible (e.g., calculate credit limit from past invoice patterns).
   - Use idempotent migration scripts that can be rerun.
4. **Rollback plan:** Each migration must have a corresponding down‑step that reverts changes without data loss.

### API Versioning
1. Introduce API version prefix `/api/v2/` for new endpoints; keep `/api/v1/` for backward compatibility.
2. Deprecate old endpoints gradually with sunset headers.
3. Update API documentation (OpenAPI/Swagger) concurrently.

### Frontend Rollout
1. **Phased release:** Start with internal users (finance team), then expand to all departments.
2. **Feature flags:** Hide new UI elements until backend is stable.
3. **Training materials:** Create video tutorials and help articles for new features.
4. **Feedback loop:** Collect user feedback via in‑app surveys and adjust prioritization.

### Testing Strategy
1. **Unit tests:** For each new service function.
2. **Integration tests:** For API endpoints, especially those involving multiple modules.
3. **End‑to‑end tests:** Critical user journeys (create invoice → approve → pay → reconcile).
4. **Performance tests:** Load test for heavy reports and bulk operations.
5. **Security tests:** Penetration testing for new authentication and authorization flows.

### Deployment Plan
1. **Development → Staging → Production** pipeline with automated tests.
2. **Blue‑green deployment:** Deploy new version alongside old, switch traffic after verification.
3. **Monitoring:** Add metrics for new endpoints (latency, error rates, usage).
4. **Alerting:** Set up alerts for migration failures or data inconsistencies.

---

## Summary of Priorities & Estimated Effort

| Module | Priority | Complexity | Estimated Person‑Months |
|--------|----------|------------|--------------------------|
| Finance (P&L, balance sheet, VAT) | P0 | High | 3–4 |
| Reports (statutory, consolidation) | P0 | High | 3–4 |
| Inventory (warehouse, serial, BOM) | P1 | High | 3–4 |
| Projects (time tracking, billing) | P1 | High | 3–4 |
| Contacts (bank details, credit limit) | P1 | Medium | 1–2 |
| Multi‑Currency (live rates, forward) | P1 | Medium | 1–2 |
| Approval Workflows (multi‑step, delegation) | P1 | Medium | 1–2 |
| Dashboard (customizable, export) | P1 | Medium | 1–2 |
| HR Module (employee, payroll, leave) | P2 | High | 4–5 |
| **Total** | | | **~20–25 person‑months** |

**Recommendation:**
1. **Immediate (next quarter):** Focus on P0 items (statutory financials, VAT reporting, period locking) to meet legal requirements.
2. **Medium term (6 months):** Address P1 items that improve operational efficiency (inventory, projects, contacts, approvals).
3. **Long term (12+ months):** Consider HR module and advanced analytics.

---

*Document prepared by Senior ERP Architect for Arca ERP Steering Committee.*
*Audit completed on 2026‑04‑15.*---

# APPENDIX A: Coding Standards & Delivery Rules

*(Extracted from PROJECT_PLAN.md — applies to all Arca development)*

## A.1 Execution Style

1. Deliver thin vertical slices. Prefer end-to-end increments that include code, verification, and doc updates over large speculative rewrites.
2. Read before changing. Inspect the relevant route, service, repository, migration, frontend view, and tests before editing.
3. Keep scope local. Only refactor beyond the target area when it directly reduces delivery risk for the active story.
4. Preserve working behavior. Existing flows, tests, and documented v1 guarantees should not regress as a side effect of cleanup.

## A.2 Testing Expectations

1. Backend behavior changes require automated tests under `backend/src/__tests__/`.
2. API contract changes should include route-level or service-level coverage for success paths and important failure paths.
3. Frontend changes must pass `frontend npm run build` at minimum.
4. If frontend work depends on backend contract changes, run both `backend npm test` and `frontend npm run build`.
5. Migration, audit, finance, approval, auth, or realtime changes must include focused regression coverage for the touched area.

## A.3 Verification Commands

- Backend full suite: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
- Migration status: `cd backend && npm run db:migration:status`
- Audit verification: `cd backend && npm run audit:verify -- --table transaction_log`

## A.4 Refactoring Rules

1. Refactor only as much as needed to make the current story safer, clearer, or testable.
2. Do not do broad architectural rewrites inside feature stories unless the story explicitly calls for it.
3. Keep user-visible behavior stable unless the story is about changing that behavior.
4. If a cleanup is valuable but non-essential, note it in Notes or create a follow-up story instead of expanding the current change.

## A.5 Database and Migration Rules

1. Schema changes must go through numbered migration files in `backend/src/db/migrations/`.
2. Never rely on accidental secondary SQLite files. Use the canonical DB path guidance already documented in README.md.
3. Any change touching system_log, transaction_log, period-locking, approvals, or financial posting must document audit impact in code comments, notes, or the commit message.
4. Migration-backed features should be tested from a clean migrated database, not only against an already-mutated local file.

## A.6 API and Compatibility Rules

1. Keep REST as the source of truth. New adapters such as MCP should wrap existing business services rather than fork them.
2. Prefer additive API changes over breaking changes where current frontend or tests already depend on an endpoint shape.
3. Validate input explicitly and keep error messages/actionability clear for both humans and agents.
4. Reuse existing auth scopes and middleware patterns unless a story explicitly introduces new scope families.

## A.7 Frontend Standards

1. Preserve the existing React/Vite stack and keep module flows aligned with actual backend capabilities.
2. UI changes should improve operator clarity: loading, empty, success, and error states matter as much as the happy path.
3. Avoid placeholders for deferred modules in v1-facing views.
4. Reuse the existing event feed, toast, and module patterns before introducing parallel UI paradigms.

## A.8 Documentation and Handoff Rules

1. If a story changes setup, shipped scope, or execution order, update README.md, V1_SCOPE_FREEZE.md, or this file as appropriate in the same change.
2. documentation.md is broader vision material; update it when architecture/reference behavior changes, not for every small implementation detail.
3. When finishing a story, update its Status, Owner, Blockers, and Notes here so the next agent inherits current truth.
4. Every finished story should leave behind enough evidence that another agent can continue without rediscovery.

---

# APPENDIX B: Work Package Template

Every module/feature must be documented using this template:

## WP-[MODULE]-[NUMBER]: [Feature Name]

Priority: P0/P1/P2 | Complexity: Low/Medium/High | Est. Hours: X

### B.1 What It Does
[One paragraph description of the feature and its business value]

### B.2 User Guide (Human Operators)

#### Step-by-Step Usage
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Screenshots / UI Description
[Describe what the user sees. E.g., A modal appears with fields: Customer (dropdown), Amount (number), Due Date (date picker). The Save button is green, Cancel is gray.]

#### Common Workflows
- Workflow A: [Describe typical use case]
- Workflow B: [Describe alternative use case]

#### Troubleshooting
| Problem | Solution |
|---------|----------|
| [Error message] | [Fix] |
| [Unexpected behavior] | [Fix] |

### B.3 Developer Guide (AI Agents)

#### API Endpoints
```
POST   /api/v1/[resource]     # Create
GET    /api/v1/[resource]     # List
GET    /api/v1/[resource]/:id # Get one
PATCH  /api/v1/[resource]/:id # Update
DELETE /api/v1/[resource]/:id # Delete
```

#### curl Examples
```bash
# Create
curl -X POST http://localhost:3000/api/v1/[resource] \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# List
curl http://localhost:3000/api/v1/[resource] \
  -H "Authorization: Bearer $TOKEN"
```

#### Database Schema
```sql
CREATE TABLE [table_name] (
  id          INTEGER PRIMARY KEY,
  field_one   TEXT NOT NULL,
  field_two   REAL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT
);
```

#### Test Scenarios
1. Happy path: [Describe successful scenario]
2. Validation error: [Describe error handling]
3. Auth required: [Describe auth failure]
4. Not found: [Describe 404 handling]

#### Rollback Procedure
1. [Step 1]
2. [Step 2]

#### Integration Points
- Uses: [list of dependencies]
- Used by: [list of dependent modules]

---

# APPENDIX C: EU/Austria Compliance and Localization

## C.1 Localization Framework

| Setting | Austria de-AT | Default en-US |
|---------|---------------|---------------|
| Language | German de-AT | English |
| Date Format | DD.MM.YYYY | MM/DD/YYYY |
| Number Format | 1.234,56 | 1,234.56 |
| Currency | EUR euro symbol | EUR |
| First Day of Week | Monday | Sunday |

### i18n Implementation
- All user-facing strings stored in backend/src/i18n/[lang].json
- Language selectable in user settings
- Invoice templates available in de-AT and en-US
- Legal documents contracts, payslips in German by default

## C.2 Austrian/EU Regulatory Compliance

### Financial Reporting UGB
- Austrian Commercial Code Unternehmensgesetzbuch compliant
- Annual financial statements format follows paragraph 189 UGB
- Balance sheet, income statement, notes required
- Audit requirements for corporations

### VAT Umsatzsteuer / MwSt

| Transaction Type | VAT Handling |
|------------------|--------------|
| Domestic B2C | 20 percent MwSt |
| Domestic B2B | Reverse charge 0 percent on invoice, recipient pays |
| Intra-EU B2B | Reverse charge 0 percent on invoice |
| Intra-EU goods | Intra-EU acquisition 19 percent reverse charge |
| Export non-EU | 0 percent VAT exempt |
| Import | Customs plus 20 percent MwSt |

### SEPA Payments
- SEPA Credit Transfer SCT for outgoing payments
- SEPA Direct Debit SDD for recurring incoming
- IBAN/BIC validation for all SEPA transactions
- pain.001.001.03 format for SEPA files

### UID-Nummer Austrian VAT Number
- Format: AT plus 9 digits e.g., ATU12345678
- Validation: Checksum digit calculation
- EU VAT number validation via VIES system

### Intrastat Reporting
- Required for intra-EU goods movement
- Monthly reporting for arrivals and dispatches
- Thresholds: 500,000 euros arrivals, 250,000 euros dispatches
- German/English form completion

### GDPR Compliance
- Personal data encryption at rest
- Consent management for marketing
- Data export/deletion rights
- Audit trail for all personal data access

## C.3 Austrian Payroll Requirements

### Income Tax ESt

| Income Bracket | Tax Rate |
|----------------|----------|
| 0 - 11,693 euros | 0 percent |
| 11,693 - 19,134 euros | 20 percent |
| 19,134 - 32,075 euros | 30 percent |
| 32,075 - 62,080 euros | 40 percent |
| 62,080 - 93,120 euros | 48 percent |
| 93,120 - 1,000,000 euros | 50 percent |
| over 1,000,000 euros | 55 percent |

### Social Security DG
- Employer contribution: approximately 21.23 percent of gross
- Employee contribution: 18.12 percent of gross
- Includes: pension, health, unemployment, accident

### SVS Selbststaendigenversicherung
- For self-employed: 27.5 percent of income
- Quarterly payment

## C.4 Region and Country Configuration

```json
{
  "region": {
    "country": "AT",
    "language": "de-AT",
    "currency": "EUR",
    "fiscal_year_start": "01-01",
    "vat_domestic": 20,
    "vat_reduced": 10,
    "vat_zero": 0
  }
}
```

---

# APPENDIX D: TechParts GmbH Company Scenario

## D.1 Company Profile

Name: TechParts GmbH
Location: Krems an der Donau, Niederoesterreich, Austria
Legal Form: Gesellschaft mit beschchränkter Haftung GmbH
UID: ATU12345678
Employees: 5

| Role | Name | Gross Salary |
|------|------|-------------|
| CEO | Linus | 8,000 euros |
| Developer | Thomas | 5,500 euros |
| Designer | Maria | 4,500 euros |
| Production Manager | Klaus | 5,000 euros |
| Admin | Anna | 3,500 euros |

Revenue: approximately 500,000 euros per year
- 60 percent Software SaaS licenses, support contracts
- 30 percent 3D Printing services custom parts
- 10 percent Material sales

Customer Distribution:
- Austria: 70 percent B2B plus B2C
- EU: 20 percent Germany, Switzerland, Italy
- Export: 10 percent USA, UK

Key Suppliers:
- BASF Germany - Filament, resins
- Mouser Electronics International - Electronics
- Local Krems - Packaging, shipping

## D.2 Transaction Scenarios

### Scenario 1: Software Sale to EU B2B Reverse Charge

Context: TechParts sells SaaS license to German company mbH Solutions

Flow:
1. Customer German company validates UID: DE123456789
2. Create invoice: 500 euros per month, reverse charge
3. Invoice shows: Steuerschuldnerschaft des Leistungsempfaengers
4. Generate SEPA XML for payment collection
5. Monthly recurring invoice automation

Gaps Identified:
- UID validation VIES API integration
- Reverse charge label on invoice
- SEPA direct debit file generation
- Recurring invoice automation

### Scenario 2: 3D Printed Parts Export Swiss

Context: Custom bracket 2,000 euros to Swiss customer, partial delivery

Flow:
1. Customer order: 10x custom brackets, 200 euros each
2. Deposit invoice: 50 percent upfront 1,000 euros
3. Production in progress
4. First delivery: 6 units
5. Final invoice: remaining 4 units plus balance

Gaps Identified:
- Export invoice template 0 percent VAT
- Deposit/advance payment handling
- Partial delivery tracking
- Shipping document generation

### Scenario 3: Intra-EU Purchase Filament

Context: 1,000 euros filament from German supplier, intra-EU acquisition

Flow:
1. PO created for 1,000 euros plus 190 euros 19 percent MwSt reverse charge
2. Deposit payment: 500 euros upfront
3. Goods received, warehoused
4. Balance payment on delivery
5. Intrastat reporting required

Gaps Identified:
- Intra-EU acquisition tax posting
- Partial payment on PO
- Landing cost calculation freight plus duty
- Intrastat form generation

### Scenario 4: Austrian Payroll

Context: Monthly payroll for Thomas Developer, 5,500 euros gross

Calculations:
- Brutto: 5,500 euros
- Lohnsteuer income tax: approximately 900 euros 20 percent bracket
- SV employee 18.12 percent: 997 euros
- Netto: 3,603 euros

Employer costs:
- Brutto: 5,500 euros
- DG employer 21.23 percent: 1,168 euros
- Total: 6,668 euros

Gaps Identified:
- Austrian payroll calculation ESt, SV, DG
- Pay slip generation German legal requirements
- SEPA file for salary payments
- Leave tracking integration

### Scenario 5: Project Billing 3D Printing

Context: Custom enclosure project, time and materials

Project Details:
- 40 hours at 80 euros per hour = 3,200 euros
- Materials: 450 euros filament, electronics
- Total: 3,650 euros

Milestones:
- 50 percent deposit 1,825 euros on order
- 50 percent final 1,825 euros on delivery

Time Tracking:
- Design: 8h
- Printing: 24h spreads across 3 days
- Assembly: 4h
- QA: 4h

Gaps Identified:
- Time tracking per task
- Material cost allocation
- Milestone-based invoicing
- Project profitability report

---

# APPENDIX E: Scenario-Based Gap Analysis

## Priority Matrix Impact vs Effort

| Feature | Impact | Effort | Quarter |
|---------|--------|--------|---------|
| Austrian Payroll | High | High | Q2 |
| EU VAT plus Reverse Charge | High | Medium | Q1 |
| SEPA Payment Files | High | Low | Q1 |
| Time Tracking | High | Medium | Q2 |
| UID/VAT Validation | Medium | Low | Q1 |
| Export Invoice Template | Medium | Low | Q1 |
| Intrastat Reporting | Medium | Medium | Q2 |
| Milestone Invoicing | Medium | Medium | Q2 |
| Material Cost Tracking | Medium | Low | Q2 |
| Deposit/Advance Handling | Medium | Medium | Q2 |

## Q1 Priorities Quick Wins
1. SEPA credit transfer file generation
2. UID/VAT number validation VIES API
3. Reverse charge invoice handling
4. Export invoice template 0 percent VAT
5. German invoice template

## Q2 Priorities High Value
1. Austrian payroll module
2. Time tracking per task
3. Intrastat reporting
4. Milestone/advance invoicing
5. Material cost tracking

## Q3 Priorities Growth
1. Multi-step approval workflows
2. Inventory BOM support
3. Project profitability reports
4. SEPA direct debit for recurring

## Q4 Priorities Enhancement
1. HR module leave, performance
2. Custom report builder
3. Dashboard customization
4. Mobile notifications

---

Document updated: 2026-04-15
For TechParts GmbH - Krems, Austria
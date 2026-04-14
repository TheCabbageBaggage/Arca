# Arca Project Plan

Status: Active handoff plan  
Last verified: 2026-04-13  
Planning basis: repository code, `README.md`, `V1_SCOPE_FREEZE.md`, backend tests, frontend production build

## Goal

Finish Arca as a **running v1 prototype** with a trustworthy local bootstrap path, a usable operator UI for the core flows already present in the backend, and documentation that another agent can execute against without re-onboarding.

## Working Rules For Any Agent

1. Treat story IDs as stable. Update `Status`, `Owner`, `Blockers`, and `Notes` instead of renaming stories.
2. Do not pull post-v1 scope into active work. HR, inventory, CRM pipeline, MCP, and worker-split hardening stay out unless this file and `V1_SCOPE_FREEZE.md` are explicitly updated together.
3. Use repo reality over aspirational docs. If `documentation.md` conflicts with code, prefer code plus this file plus `README.md`.
4. When a story is finished, record evidence in the relevant PR/commit message and update this file in the same change.

## AI-Native Delivery Standards

These standards are for any coding agent working in this repository. The goal is consistent delivery quality without repeated onboarding.

### 1. Execution Style

1. Deliver thin vertical slices. Prefer end-to-end increments that include code, verification, and doc updates over large speculative rewrites.
2. Read before changing. Inspect the relevant route, service, repository, migration, frontend view, and tests before editing.
3. Keep scope local. Only refactor beyond the target area when it directly reduces delivery risk for the active story.
4. Preserve working behavior. Existing flows, tests, and documented v1 guarantees should not regress as a side effect of cleanup.

### 2. Testing Expectations

1. Backend behavior changes require automated tests under `backend/src/__tests__/`.
2. API contract changes should include route-level or service-level coverage for success paths and important failure paths.
3. Frontend changes must pass `frontend npm run build` at minimum.
4. If frontend work depends on backend contract changes, run both `backend npm test` and `frontend npm run build`.
5. Migration, audit, finance, approval, auth, or realtime changes must include focused regression coverage for the touched area.

### 3. Verification Commands

Use the smallest set that proves the story, then record what was run:

- Backend full suite: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
- Migration status: `cd backend && npm run db:migration:status`
- Audit verification: `cd backend && npm run audit:verify -- --table transaction_log`
- System log verification: `cd backend && npm run audit:verify-system-log`

### 4. Refactoring Rules

1. Refactor only as much as needed to make the current story safer, clearer, or testable.
2. Do not do broad architectural rewrites inside feature stories unless the story explicitly calls for it.
3. Keep user-visible behavior stable unless the story is about changing that behavior.
4. If a cleanup is valuable but non-essential, note it in `Notes` or create a follow-up story instead of expanding the current change.

### 5. Database and Migration Rules

1. Schema changes must go through numbered migration files in `backend/src/db/migrations/`.
2. Never rely on accidental secondary SQLite files. Use the canonical DB path guidance already documented in `README.md`.
3. Any change touching `system_log`, `transaction_log`, period-locking, approvals, or financial posting must document audit impact in code comments, notes, or the commit message.
4. Migration-backed features should be tested from a clean migrated database, not only against an already-mutated local file.

### 6. API and Compatibility Rules

1. Keep REST as the source of truth. New adapters such as MCP should wrap existing business services rather than fork them.
2. Prefer additive API changes over breaking changes where current frontend or tests already depend on an endpoint shape.
3. Validate input explicitly and keep error messages/actionability clear for both humans and agents.
4. Reuse existing auth scopes and middleware patterns unless a story explicitly introduces new scope families.

### 7. Frontend Standards

1. Preserve the existing React/Vite stack and keep module flows aligned with actual backend capabilities.
2. UI changes should improve operator clarity: loading, empty, success, and error states matter as much as the happy path.
3. Avoid placeholders for deferred modules in v1-facing views.
4. Reuse the existing event feed, toast, and module patterns before introducing parallel UI paradigms.

### 8. Documentation and Handoff Rules

1. If a story changes setup, shipped scope, or execution order, update `README.md`, `V1_SCOPE_FREEZE.md`, or this file as appropriate in the same change.
2. `documentation.md` is broader vision material; update it when architecture/reference behavior changes, not for every small implementation detail.
3. When finishing a story, update its `Status`, `Owner`, `Blockers`, and `Notes` here so the next agent inherits current truth.
4. Every finished story should leave behind enough evidence that another agent can continue without rediscovery.

## File Purpose Map

| File | Purpose | When to update |
|---|---|---|
| [`README.md`](README.md) | Public repo entry point, quickstart, verified v1 capability summary | When shipped behavior or setup steps change |
| [`V1_SCOPE_FREEZE.md`](V1_SCOPE_FREEZE.md) | Release contract for what is in and out of `v1` | When scope changes or a major v1 milestone lands |
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | Execution backlog and handoff plan for agents/contributors | When story status, dependencies, or release order changes |
| [`documentation.md`](documentation.md) | Broad architecture/product vision and deep reference material | When the long-term system design changes |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting and security focus areas | When policy/contact/security process changes |

## Verified Repository Baseline

The following is already present and should be treated as implemented baseline, not fresh backlog:

- Auth: login and admin-created agent keys.
- Agent tasks: create, list, poll, approve/reject, natural-language entry.
- LLM routing: provider listing, routing rules, provider test endpoint, token usage persistence.
- Contacts and documents: CRUD/list flows with Nextcloud or offline fallback behavior.
- Finance core: invoices, payments, journal entries, `pl`, `vat`, and `open-ar` reports.
- Spend approval: threshold enforcement for agent-initiated finance writes plus resume-on-approval flow.
- Projects and tokens: projects, sprints, user stories, token estimation, burndown, budget, and forecast endpoints.
- Audit and integrity: immutable logs plus verification CLI.
- Realtime: event bus + `Socket.IO` bridge using event name `arca:event`.
- Frontend baseline: React operations console with tabbed modules, manual bearer-token auth, task actions, approvals, and live event feed.

Verification captured on `2026-04-13`:

- `backend npm test` passed with `32/32` tests.
- `frontend npm run build` passed.

## Prototype Gaps To Close

These are the main remaining blockers between the current repository and a polished, reproducible v1 prototype:

- Clean-start bootstrap has not yet been turned into a verified smoke-tested workflow another agent can run end-to-end without tribal knowledge.
- The frontend still relies on pasted bearer tokens instead of using the existing backend login endpoint.
- Demo data and approval-rule setup are not yet packaged as a repeatable prototype seed path.
- Core UI flows exist, but they still need polish around error handling, empty/loading states, and guided operator actions.
- Docs outside the immediate v1 files are still broader than the shippable subset.

## AI-Native Estimation Model

The estimates below assume a strong coding agent such as GPT-5.4 working in an AI-native way on an already-started repository: fast code reading, direct implementation, immediate test repair, and minimal meeting overhead.

Planning conversion used in this file:

- `1 SP ≈ 40k-100k total tokens`
- `1 SP ≈ 0.35-0.8 hours` of focused GPT-5.4 delivery time

This model assumes:

- Existing repo foundations are reused rather than rewritten
- Stories are delivered as thin vertical slices
- Verification stays proportionate to the touched surface
- External integration hardening is implemented to prototype/product level, not enterprise certification level

Current planning totals:

- Remaining backlog: `274 SP`
- Remaining v1/prototype backlog: `54 SP`
- Remaining post-v1 backlog: `220 SP`

Portfolio estimate for GPT-5.4:

- Remaining full plan: `~11M-27M tokens`, `~96-219 hours`
- Remaining v1/prototype work: `~2.2M-5.4M tokens`, `~19-43 hours`
- Remaining post-v1 work: `~8.8M-22M tokens`, `~77-176 hours`

If parallel agents are used effectively on disjoint workstreams, wall-clock time can drop materially even when total token usage rises.

## AI-Native Epic Budget

| Epic | SP | Token estimate | GPT-5.4 time estimate |
|---|---:|---:|---:|
| `ARCA-E1` Prototype Bootstrap | 13 | `~0.52M-1.30M` | `~5-10 h` |
| `ARCA-E2` Operator Access | 8 | `~0.32M-0.80M` | `~3-6 h` |
| `ARCA-E3` Finance + Approval UX | 18 | `~0.72M-1.80M` | `~6-14 h` |
| `ARCA-E4` Projects + Documents UX | 12 | `~0.48M-1.20M` | `~4-10 h` |
| `ARCA-E5` Release Readiness remaining | 3 | `~0.12M-0.30M` | `~1-2 h` |
| `ARCA-E6` HR Module | 24 | `~0.96M-2.40M` | `~8-19 h` |
| `ARCA-E7` Inventory + Material Master | 24 | `~0.96M-2.40M` | `~8-19 h` |
| `ARCA-E8` CRM Pipeline | 21 | `~0.84M-2.10M` | `~7-17 h` |
| `ARCA-E9` MCP Endpoint | 16 | `~0.64M-1.60M` | `~6-13 h` |
| `ARCA-E10` Fiori UX + Dashboard | 21 | `~0.84M-2.10M` | `~7-17 h` |
| `ARCA-E11` Finance Reporting + Audit Ops | 32 | `~1.28M-3.20M` | `~11-26 h` |
| `ARCA-E12` Platform Hardening + Operability | 29 | `~1.16M-2.90M` | `~10-23 h` |
| `ARCA-E13` Intelligence + Automation Extensions | 53 | `~2.12M-5.30M` | `~19-42 h` |

Notes on interpretation:

1. These are delivery estimates, not guarantees. Integration-heavy stories can bunch toward the top of the range.
2. Token totals include code generation, repo reading, retries, tests, and small follow-up fixes.
3. Wall-clock duration for a human-supervised project will usually be longer than raw model work time because of review, prioritization, and environment feedback loops.

## Epic Overview

| Epic | Name | Outcome | Status |
|---|---|---|---|
| `ARCA-E1` | Prototype Bootstrap | Clean local startup and smoke verification from a fresh checkout | `done` |
| `ARCA-E2` | Operator Access | Frontend login/session flow replaces manual token-only usage | `todo` |
| `ARCA-E3` | Finance + Approval UX | Finance and approval flows are usable as a prototype demo without raw API knowledge | `done` |
| `ARCA-E4` | Projects + Documents UX | Project/story/document flows are coherent and demo-ready in the UI | `done` |
| `ARCA-E5` | Release Readiness | Docs, checklists, and prototype evidence stay aligned with the repo | `done` |

## Post-v1 Expansion Overview

These epics are intentionally **deferred from v1** but remain part of the planned product roadmap and should stay visible for future execution.

| Epic | Name | Outcome | Status |
|---|---|---|---|
| `ARCA-E6` | HR Module | Employee directory, contracts, leave, payroll prep, and org chart foundations exist in schema, API, and UI planning | `deferred` |
| `ARCA-E7` | Inventory + Material Master | Material records, stock movements, reorder alerts, and valuation workflows are implemented on top of the core ledger | `deferred` |
| `ARCA-E8` | CRM Pipeline | Lead-stage pipeline, offers/deals, and sales activity tracking extend the existing contacts baseline | `deferred` |
| `ARCA-E9` | MCP Endpoint | REST capabilities are exposed through an MCP-compatible server layer after v1 stability | `deferred` |
| `ARCA-E10` | Fiori UX + Dashboard | The operator experience aligns more closely with the documented shell, launchpad, and dashboard vision | `deferred` |
| `ARCA-E11` | Finance Reporting + Audit Ops | DATEV, richer reporting, exports, period controls, and audit operations are productized beyond the current core APIs | `deferred` |
| `ARCA-E12` | Platform Hardening + Operability | Queue hardening, backup/retention, eventing, identity, and workspace/platform concerns are delivered as explicit product capabilities | `deferred` |
| `ARCA-E13` | Intelligence + Automation Extensions | The recommended OCR, banking, search, forecasting, mobile, and automation extensions are tracked as executable delivery slices | `deferred` |

## Epic Backlog

### `ARCA-E1` Prototype Bootstrap

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-001` | `done` | As a contributor, I want a verified local bootstrap path so I can start the system from a clean checkout without guessing. | Validate `.env.example`; verify `docker compose up --build -d`; verify migration path against `data/sqlite/arca.db`; document exact commands and failure modes in `README.md`. | 3 | None | Unassigned | None | Use existing DB path safety guidance in `README.md`. |
| `ARCA-US-002` | `done` | As a demo operator, I want reproducible seed data so I can exercise contacts, finance, projects, and approvals immediately. | Add idempotent seed script(s) for bootstrap admin, sample contacts, one project, one sprint, one story, one invoice, and one approval rule; keep canonical paths under `scripts/`; document how to reset/reseed. | 5 | `ARCA-US-001` | Unassigned | None | Existing `scripts/seed-spend-approval.sql` is a starting point only. |
| `ARCA-US-003` | `done` | As another agent, I want a smoke-test command so I can verify the prototype before or after making changes. | Add a non-interactive smoke test that hits health, login, at least one create/list flow, and audit verification; document expected success output; make it runnable from repo root. | 5 | `ARCA-US-001`, `ARCA-US-002` | Unassigned | None | Favor shell or Node tooling already used in the repo. |

### `ARCA-E2` Operator Access

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-101` | `done` | As an operator, I want to log in from the frontend so I do not need to paste a JWT manually. | Use existing `/api/v1/auth/login`; add login form, success/error handling, logout, and token persistence; preserve agent-key/manual token entry as an advanced fallback, not the primary path. | 5 | `ARCA-US-001` | Unassigned | None | Current manual token state lives in `frontend/src/App.jsx`. |
| `ARCA-US-102` | `in-progress` | As an operator, I want the UI to make session state obvious so I know whether actions will work before submitting forms. | Show active auth mode, token/session expiry-safe state, disabled states when unauthenticated, and clear empty/error banners; keep the current localStorage pattern or replace it consistently. | 3 | `ARCA-US-101` | Unassigned | None | Pairs naturally with the existing toast and status components. |

### `ARCA-E3` Finance + Approval UX

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-201` | `done` | As a finance operator, I want complete invoice/payment/journal workflows in the UI so I can run the finance demo without Postman. | Ensure create + list/report coverage for invoices, payments, and journal entries; wire success/error states to toasts; surface report data clearly; keep payload mapping consistent with `backend/src/api/finance.routes.js`. | 8 | `ARCA-US-101` | Current turn | None | Added finance list routes (`/payments`, `/journal-entries`) and UI coverage for create + list/report with toast handling. |
| `ARCA-US-202` | `done` | As an approver, I want waiting approval tasks to be easy to spot and act on so I can resume blocked finance work quickly. | Add filtered waiting-approval task views, approve/reject affordances, clear task context, and automatic refresh from `arca:event`; support both optimistic refresh and manual reload fallback. | 5 | `ARCA-US-101`, `ARCA-US-201` | Current turn | None | Added waiting-approval queue in Finance tab with approve/reject actions, optimistic status updates, manual reload, and event-driven refresh. |
| `ARCA-US-203` | `done` | As a demo setup owner, I want a manageable spend-approval configuration path so prototype setup does not require reading SQL blindly. | Either add a minimal admin CRUD path for approval rules or make the seed/setup path explicit and discoverable in docs/scripts; whichever path is chosen must be reflected in `README.md` and smoke test docs. | 5 | `ARCA-US-002` | Current turn | None | Chose explicit seed/setup path; documented `scripts/seed-spend-approval.sql` in README and added waiting-approval smoke-test coverage. |

### `ARCA-E4` Projects + Documents UX

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-301` | `done` | As a project operator, I want project, sprint, and story flows to feel connected so I can demo planning end-to-end. | Improve project creation, sprint creation, story creation, token estimation, and burndown visibility in the UI; keep field names aligned to `backend/src/api/projects.routes.js` and `/tokens/*` endpoints. | 5 | `ARCA-US-101` | Current turn | None | Added connected project/sprint/story create+list coverage with toast wiring, sprint-select story filtering, and linked flow status panel. |
| `ARCA-US-302` | `done` | As an operator, I want document workflows to show storage outcome so I know whether a file landed in Nextcloud or local offline mode. | Surface document metadata and upload result state, improve document list/delete affordances, and keep offline/remote behavior understandable without reading backend logs. | 5 | `ARCA-US-101` | Current turn | None | Document list now surfaces offline vs Nextcloud storage state and upload toasts include resolved storage mode. |
| `ARCA-US-303` | `done` | As an operator, I want module navigation to reflect actual v1 scope so I do not assume missing modules are broken. | Keep nav limited to current v1 modules, clarify deferred modules in copy, and avoid placeholders for HR/inventory/CRM pipeline/MCP. | 2 | `ARCA-US-101` | Current turn | None | Added one-click sequential demo workflow (project → sprint → story) with linked IDs and guided UI copy. |

### `ARCA-E5` Release Readiness

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-401` | `done` | As a contributor, I want the repository docs to match the actual codebase so I can trust the stated v1 scope. | Align `README.md` and `V1_SCOPE_FREEZE.md` with implemented repo state; stop over-claiming deferred modules; add a file-purpose map and explicit v1 source-of-truth docs. | 3 | None | Current turn | None | Completed in this change set. |
| `ARCA-US-402` | `done` | As another agent, I want a tracked execution backlog so I can continue work without repository archaeology. | Create `PROJECT_PLAN.md` with epics, story IDs, technical requirements, story points, dependencies, and execution rules. | 3 | None | Current turn | None | Completed in this change set. |
| `ARCA-US-403` | `done` | As a release owner, I want a prototype exit checklist so I can decide when `v1` is demo-ready. | Add a concise release checklist covering bootstrap, smoke test, core UI walkthrough, audit verify, backup path, and docs alignment; link it from `README.md` or this plan. | 3 | `ARCA-US-001`, `ARCA-US-003`, `ARCA-US-201`, `ARCA-US-301`, `ARCA-US-302` | Current turn | None | Added `PROTOTYPE_EXIT_CHECKLIST.md` with binary checks and linked it from README. |

## Post-v1 Epic Backlog

### `ARCA-E6` HR Module

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-501` | `deferred` | As an operations lead, I want an employee directory so I can manage staff records in the ERP instead of external spreadsheets. | Design HR schema for employees, roles, departments, managers, employment status, and contact metadata; add migrations; implement repository/service/API layers for CRUD and list/filter flows; define auth scopes for HR read/write access. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | Start with backend and test coverage before UI work. |
| `ARCA-US-502` | `deferred` | As an HR operator, I want to store employment contracts and related documents so employment data stays connected to the employee record. | Add contract schema and lifecycle states; link contracts to employees and documents; support effective dates, compensation fields, contract type, and metadata; expose CRUD APIs and document association rules; cover audit logging expectations for HR changes. | 8 | `ARCA-US-501`, `ARCA-US-302` | Unassigned | Post-v1 gate | Reuse document patterns where possible. |
| `ARCA-US-503` | `deferred` | As an HR/payroll operator, I want leave tracking, payroll prep, and org chart data so small-team HR operations can run from Arca. | Add leave request/allocation schema, payroll-prep export fields, and org-chart relationships; implement leave balance calculations, manager hierarchy queries, and payroll-prep reporting endpoints; define minimal UI/CSV export needs and tests. | 8 | `ARCA-US-501`, `ARCA-US-502` | Unassigned | Post-v1 gate | Payroll prep, not full payroll engine, is the target. |

### `ARCA-E7` Inventory + Material Master

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-601` | `deferred` | As an operator, I want a material master so products, SKUs, units, and reorder settings are maintained in one place. | Add material/item schema with SKU, unit, category, cost method, reorder threshold, supplier linkage, and status; implement CRUD APIs and validation rules; define inventory-related scopes and baseline tests. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | Keep supplier linkage compatible with contacts. |
| `ARCA-US-602` | `deferred` | As a warehouse or finance operator, I want stock movements recorded so inventory counts and stock history are traceable. | Add stock movement ledger tables for receipts, issues, adjustments, transfers, and reservations; implement movement posting service with audit logging and invariant checks; expose movement APIs and stock-on-hand queries; test negative-stock and concurrency edge cases. | 8 | `ARCA-US-601`, `ARCA-US-201` | Unassigned | Post-v1 gate | Inventory ledger should align with finance discipline. |
| `ARCA-US-603` | `deferred` | As a planner, I want reorder alerts and valuation workflows so I can restock on time and understand inventory value. | Implement reorder calculations, alert thresholds, and valuation methods such as moving average or FIFO; add reporting endpoints and background recalculation strategy; define how valuation integrates with finance reports without destabilizing v1 finance core. | 8 | `ARCA-US-601`, `ARCA-US-602` | Unassigned | Post-v1 gate | Choose one valuation method first if scope needs tightening. |

### `ARCA-E8` CRM Pipeline

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-701` | `deferred` | As a sales operator, I want lead stages beyond basic contacts so I can manage the pipeline from first contact to qualified opportunity. | Extend current contacts baseline with CRM entities or stage metadata for lead qualification, owner, value, probability, and next step; add stage transition rules, filters, and audit logging; expose CRM list/detail/update endpoints. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | Do not break existing contacts APIs. |
| `ARCA-US-702` | `deferred` | As a sales operator, I want offers and deal conversion so I can move qualified leads into real commercial workflows. | Add offer/quote and deal schema; implement conversion from lead/contact to offer/deal; support amount, status, expected close date, and linked project/contact references; add APIs, validations, and tests for conversion flows. | 8 | `ARCA-US-701`, `ARCA-US-301` | Unassigned | Post-v1 gate | Keep downstream links to projects explicit. |
| `ARCA-US-703` | `deferred` | As a sales operator, I want a sales activity timeline so calls, emails, notes, and meetings are visible in context. | Add sales activity/event schema linked to contacts/leads/deals; support typed activity entries, timestamps, owner, reminders, and simple timeline queries; expose APIs and define UI/timeline rendering requirements for a later frontend slice. | 5 | `ARCA-US-701` | Unassigned | Post-v1 gate | Activity timeline can launch without email sync. |

### `ARCA-E9` MCP Endpoint

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-801` | `deferred` | As an agent orchestrator, I want an MCP server endpoint so Arca actions can be exposed as structured tools instead of raw REST calls. | Define MCP surface area for the stable v1 modules first; map auth, tool schemas, and error behavior to existing REST services; implement server bootstrap, capability discovery, and a minimal integration test harness; document which REST endpoints are wrapped versus deferred. | 8 | `ARCA-US-403`, `ARCA-US-401` | Unassigned | Post-v1 gate | Keep REST as source of truth; MCP is an adapter layer. |
| `ARCA-US-802` | `deferred` | As an agent developer, I want MCP tools for core finance, projects, documents, and task operations so orchestration frameworks can integrate with less custom glue. | Expose bounded tool groups for task creation/status, finance posting/reporting, projects/tokens, and documents; reuse existing auth scopes and validation rules; add contract tests that assert MCP calls and REST calls produce equivalent behavior. | 8 | `ARCA-US-801`, `ARCA-US-201`, `ARCA-US-301`, `ARCA-US-302` | Unassigned | Post-v1 gate | Add modules incrementally rather than exposing the full surface at once. |

### `ARCA-E10` Fiori UX + Dashboard

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-901` | `deferred` | As an operator, I want the UI shell to match the documented SAP Fiori-inspired experience so navigation feels coherent across modules. | Introduce a stable design-token layer aligned with the documented shell colors and semantic states; implement shell bar, top-level navigation, notification/agent status areas, and consistent module layouts; preserve responsiveness and current working flows during the redesign. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | This is UX/system design work, not just CSS cleanup. |
| `ARCA-US-902` | `deferred` | As an operator, I want a configurable launchpad/dashboard so I can see finance, project, agent, and document KPIs in one place. | Build launchpad/dashboard widgets for liquidity, receivables, token economy, agent activity, recent documents, and alerts; support module deep-links and a simple widget configuration model; align with realtime event feed where practical. | 8 | `ARCA-US-901`, `ARCA-US-201`, `ARCA-US-301`, `ARCA-US-302` | Unassigned | Post-v1 gate | Covers the intent of Sections 8-9 beyond the current console. |
| `ARCA-US-903` | `deferred` | As an operator, I want global search and universal navigation aids so I can jump between records, documents, and workflows quickly. | Add global search entry point, cross-module navigation model, and result grouping for contacts, projects, finance records, and documents; coordinate future compatibility with semantic search and notifications; define API/search abstractions before UI polish. | 5 | `ARCA-US-901`, `ARCA-US-1101` | Unassigned | Post-v1 gate | Start with keyword search, then layer semantic retrieval later. |

### `ARCA-E11` Finance Reporting + Audit Ops

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-1001` | `deferred` | As a finance operator, I want DATEV and audit exports so I can hand off compliant accounting data to an external advisor. | Define export formats for transaction log, payroll-prep handoff, and relevant audit data; add export endpoints/CLI flows, retention guidance, and tests for deterministic file generation; ensure exported data maps cleanly from immutable ledgers. | 8 | `ARCA-US-201`, `ARCA-US-503` | Unassigned | Post-v1 gate | Documentation currently claims DATEV; the plan now tracks the delivery explicitly. |
| `ARCA-US-1002` | `deferred` | As a finance operator, I want richer reports and dashboards so I can monitor profitability, cashflow, and AI operating cost in one place. | Extend reporting beyond current `pl`, `vat`, and `open-ar` with token cost dashboards, cashflow forecast, exportable report views, and trend reporting; define report calculation contracts and snapshot/export behavior. | 8 | `ARCA-US-201` | Unassigned | Post-v1 gate | Covers Sections 17 and Tier 2 reporting extensions. |
| `ARCA-US-1003` | `deferred` | As an auditor or finance lead, I want period locking, storno workflows, transaction-log UI, and audit-log export to be first-class operations. | Add explicit accounting-period lock/unlock flows, storno-only correction UX, transaction/system log browse and export capabilities, and chain-verification entry points; align UI and CLI behavior with append-only guarantees. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | The underlying model is partly described in docs; this story productizes it. |
| `ARCA-US-1004` | `deferred` | As a finance operator, I want multi-currency and FX booking support so international transactions are handled correctly. | Add FX rate source strategy, base-currency conversions, realized/unrealized gain-loss booking rules, currency-aware reporting, and tests for invoice/payment/journal scenarios across currencies. | 8 | `ARCA-US-201` | Unassigned | Post-v1 gate | Listed in recommended extensions and touches finance deeply. |

### `ARCA-E12` Platform Hardening + Operability

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-1101` | `deferred` | As a platform owner, I want BullMQ-style queue hardening and worker separation so agent execution is more durable and scalable than the current in-process loop. | Replace or augment in-process task scheduling with Redis-backed queue/worker roles, retries, dead-letter handling, and operational visibility; preserve current task semantics and approval flow contracts while introducing worker boundaries. | 8 | `ARCA-US-403` | Unassigned | Post-v1 gate | This closes the gap between current repo reality and documented architecture. |
| `ARCA-US-1102` | `deferred` | As an operator, I want backup, restore, retention, and optional off-site sync to be explicit product workflows so recovery is not tribal knowledge. | Productize backup status, restore guidance, retention policy, and optional Nextcloud/off-site backup sync; add smoke verification for backups and document operational runbooks; align with `backup-cron` and audit expectations. | 5 | `ARCA-US-001`, `ARCA-US-403` | Unassigned | Post-v1 gate | The repo has backup mechanics; this story makes them operationally complete. |
| `ARCA-US-1103` | `deferred` | As an integration owner, I want webhook/event-engine capabilities so external systems can trigger or react to ERP state changes. | Extend current realtime event stream into a durable event/webhook engine with subscription model, outbound delivery, retry behavior, and event filtering; define trusted sources and auth model for inbound triggers. | 8 | `ARCA-US-1101` | Unassigned | Post-v1 gate | Builds on the existing realtime bus. |
| `ARCA-US-1104` | `deferred` | As an admin, I want stronger identity and workspace controls so Arca can support SSO and multiple isolated business entities. | Add OIDC/SSO integration options, tenant/workspace scoping model, isolation rules, auth middleware changes, and migration strategy for single-tenant existing data; define admin UX and security posture before implementation. | 8 | `ARCA-US-101`, `ARCA-US-403` | Unassigned | Post-v1 gate | Groups OIDC/SSO and multi-tenant/workspace roadmap items. |

### `ARCA-E13` Intelligence + Automation Extensions

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-1201` | `deferred` | As an AP operator, I want email invoice ingestion with OCR so incoming invoices can be detected, parsed, and turned into accounting work automatically. | Add IMAP intake, document classification, OCR pipeline, extraction validation, and finance handoff flow for AP entries; support attaching original files to document storage and tracing the ingestion result in logs. | 8 | `ARCA-US-302`, `ARCA-US-201` | Unassigned | Post-v1 gate | Combines Email Invoice Parsing and OCR Pipeline from the extensions list. |
| `ARCA-US-1202` | `deferred` | As a finance operator, I want bank-sync and reconciliation automation so routine cash movement matching becomes low-touch. | Integrate at least one bank-sync provider path, normalize imported transactions, add matching/reconciliation workflows, and connect cashflow forecasting plus dunning triggers where appropriate; document provider abstraction and regional constraints. | 8 | `ARCA-US-201`, `ARCA-US-1002` | Unassigned | Post-v1 gate | Covers Open Banking / Bank Sync and related reconciliation value. |
| `ARCA-US-1203` | `deferred` | As an accounts receivable operator, I want automated dunning and contract-lifecycle reminders so renewals and collections do not slip through the cracks. | Add staged reminder workflows, contract renewal metadata, alert scheduling, generated document delivery, and audit visibility for reminder actions; integrate with contacts/CRM/documents without duplicating entities. | 8 | `ARCA-US-701`, `ARCA-US-502`, `ARCA-US-302` | Unassigned | Post-v1 gate | Groups Automated Dunning and Contract Lifecycle Management. |
| `ARCA-US-1204` | `deferred` | As an operator and agent developer, I want persistent agent memory, prompt templates, and semantic search so the system becomes more efficient and discoverable over time. | Implement `SQLite-VSS` or equivalent vector-store strategy, memory lifecycle rules, prompt-template versioning, and unified search across records/documents/bookings; define retrieval APIs that can serve both UI search and agent execution. | 8 | `ARCA-US-1101` | Unassigned | Post-v1 gate | Covers agent memory, semantic ERP search, and prompt templates. |
| `ARCA-US-1205` | `deferred` | As a mobile operator, I want a PWA experience with approvals and notifications so I can act on the go. | Add installable PWA shell, offline-safe core views, push notification strategy, and approval/task flows optimized for mobile; define sync boundaries and fallback behavior when the network is unavailable. | 5 | `ARCA-US-901`, `ARCA-US-202` | Unassigned | Post-v1 gate | Mobile PWA should build on a stable web UX, not fork it. |
| `ARCA-US-1206` | `deferred` | As a planning owner, I want predictive models and intelligent assistants so Arca can forecast business outcomes rather than only recording them. | Track predictive revenue, predictive inventory, tax calendar reminders, time-intelligence suggestions, and meeting-note-to-CRM automation as one intelligence workstream; define data prerequisites, model/service boundaries, and explainability requirements before implementation. | 8 | `ARCA-US-603`, `ARCA-US-701`, `ARCA-US-1202` | Unassigned | Post-v1 gate | Groups several forward-looking analytics/assistant features into one sequenced program. |
| `ARCA-US-1207` | `deferred` | As an ecosystem owner, I want an agent marketplace and notarized audit trail options so advanced deployments can share automations and strengthen trust. | Define plugin/marketplace packaging for reusable agent workflows, governance/versioning rules, and optional audit-trail notarization strategy layered on top of the existing hash chain; document clear separation from the core v1 compliance baseline. | 8 | `ARCA-US-801`, `ARCA-US-1003` | Unassigned | Post-v1 gate | Covers Agent Marketplace and Audit Trail Notarization. |

## Recommended Execution Order

1. Finish `ARCA-E1` first. A reliable bootstrap path reduces guesswork for every later story.
2. Then land `ARCA-E2` so the frontend can exercise the backend without manual token handling.
3. Execute `ARCA-E3` and `ARCA-E4` in parallel where possible because they touch different user-facing flows.
4. Close with `ARCA-E5` to lock in release evidence and keep docs synchronized.
5. Only after the v1 prototype exit criteria are met, open `ARCA-E6` through `ARCA-E13` as post-v1 delivery tracks.

## Non-Goals For v1

- HR employee records, contracts, leave, payroll prep, and org chart APIs/schema
- Inventory and material master, including stock movement, reorder alerts, and valuation workflows
- Full CRM pipeline beyond current contacts coverage, including lead stages, offer/deal conversion, and sales activity timeline
- MCP endpoint as a v1 deliverable
- SAP Fiori shell/launchpad parity as a v1 deliverable
- DATEV, advanced reporting, multi-currency, and full audit-ops productization as v1 deliverables
- Queue hardening, SSO, multi-tenant workspaces, webhook engine, and backup productization as v1 deliverables
- OCR, bank sync, dunning, agent memory, semantic search, mobile PWA, forecasting, marketplace, and notarization as v1 deliverables
- BullMQ worker split / queue hardening as a required v1 deliverable
- Advanced analytics dashboards beyond the current reporting endpoints

These are tracked in the post-v1 epic backlog above so they remain planned without expanding the v1 execution baseline.

## Story Point Scale

Use a light Fibonacci scale: `1, 2, 3, 5, 8`.

- `1`: trivial docs/config tweak
- `2-3`: small contained change
- `5`: moderate feature slice touching multiple files
- `8`: substantial but still bounded delivery slice

These points are for planning/handoff only. They do **not** replace the app's token-estimation model used inside the projects module.

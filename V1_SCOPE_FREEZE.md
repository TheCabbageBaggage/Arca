# Arca v1 Scope Freeze

Status: Active baseline aligned to repository state  
Date: 2026-04-13  
Source of truth: repository code + passing tests + `README.md` + `PROJECT_PLAN.md`

## Objective

Freeze a realistic shipping subset for Arca `v1` that matches the repository as it exists today, while explicitly deferring non-critical modules to avoid release risk and onboarding confusion.

## Scope Decision

### Ship in v1 (Must Have)

1. Platform baseline
- Docker stack (`nginx`, `frontend`, `backend`, `redis`, `backup-cron`)
- Auth (`/api/v1/auth/login`, `/api/v1/auth/agent-keys`)
- Health and API wiring

2. Agent + LLM core
- Agent task creation and polling (`/api/v1/agents/tasks`, `/api/v1/agents/nl`)
- LLM provider list, routing rules, provider test endpoints
- Token usage persistence and reporting endpoints currently implemented

3. Core ERP data flows already implemented
- Contacts + document attachment/list/delete
- Finance: invoices, payments, journal entries, core reports (`pl`, `vat`, `open-ar`)
- Projects + sprints + user stories + token estimation + burndown/budget endpoints

4. Audit and data integrity
- Immutable `system_log` and `transaction_log` enforcement
- Hash chain verification CLI

5. Operator experience already in repo
- Spend-approval governance hook is implemented
- Basic realtime event stream is implemented (`Socket.IO`, event name `arca:event`)
- Frontend scaffold has been replaced by a functional operations shell for core flows

6. Remaining deltas before calling the prototype release-ready
- Validate and document a clean `docker compose up` bootstrap from scratch
- Add/demo seed data and approval-rule seeding for a reproducible prototype walkthrough
- Tighten README/API/runtime documentation so it matches the shipped subset without over-claiming
- Close any frontend usability gaps that still force raw API knowledge during the main demo flows

### Defer from v1 (Post-v1)

1. Full HR module (Section 22)
- Employee directory, contracts, leave, payroll prep, org chart APIs and schema

2. Inventory and material master (Section 11)
- Stock movement, reorder alerts, valuation workflows

3. CRM pipeline module (Section 13) beyond existing contacts
- Lead stages, offer/deal conversion, sales activity timeline

4. MCP server endpoint (Section 7.3/7.7)
- Keep REST-first for v1; add MCP in v1.1+

5. BullMQ worker architecture
- Current in-process task execution remains for v1
- Queue hardening and worker split moves to v1.1+

6. Advanced analytics/reports and extension tiers (Section 17 + 20)

## Traceability Matrix (Documentation -> Release Decision)

| Documentation area | v1 decision | Notes |
|---|---|---|
| Sections 1-6 Core architecture/auth/LLM/agents | Ship | Existing foundation in repo |
| Section 7 orchestration | Partial ship | REST API, spend approval, and basic events ship; MCP deferred |
| Sections 8-10 UI/dashboard/master data | Partial ship | Functional operator console ships, not full product-grade UX parity |
| Section 11 inventory | Defer | Not implemented |
| Section 12 finance | Ship | Core endpoints and logs already present |
| Section 13 CRM funnel | Defer | Contacts stay in v1, pipeline deferred |
| Sections 14-15 projects/tokens | Ship | Implemented and tested |
| Section 16 documents | Ship | Implemented with Nextcloud/offline behavior |
| Section 17 reports | Partial ship | Keep existing reports, advanced dashboards deferred |
| Section 18 backup/db | Ship | Migrations + backup cron present |
| Section 19 API reference | Partial ship | Keep only currently shipped endpoints + approved deltas |
| Section 21 audit logs | Ship | Implemented and tested |
| Section 22 HR module | Defer | Entire module post-v1 |

## Definition of Done for v1

1. Backend
- All shipped endpoints stable and covered by automated tests
- Spend-approval flow enforced for finance write operations above threshold
- Migration set deterministic and reproducible from empty DB

2. Frontend
- Operations shell covers the core demo flows for Contacts/Finance/Projects/Documents/Tasks
- Realtime events and approval flows are visible and usable from the UI

3. Operability
- `docker compose up` path works on clean setup with docs
- Demo seed/setup path is reproducible for another contributor or agent
- Backup and audit verify commands documented and validated

4. Documentation
- `README.md`, `V1_SCOPE_FREEZE.md`, and `PROJECT_PLAN.md` match the shipped scope
- `documentation.md` may stay broader, but must not be treated as the exact v1 release contract

## Freeze Rules

1. No new feature area enters `v1` unless:
- It is required to complete an already-included core flow, and
- It does not expand API surface by more than one bounded endpoint group.

2. New modules (HR, inventory, CRM pipeline, MCP, BullMQ worker split) are explicitly blocked from `v1` unless a formal scope-change decision is recorded.

3. Any scope change must include:
- Why current scope is insufficient
- Delivery and testing impact
- What moves out to keep the release date stable

## Repository Verification Snapshot (2026-04-13)

1. Backend automated tests pass (`32/32`).
2. Frontend production build passes.
3. Spend approval, realtime events, and the operator UI baseline are present in the repo.
4. The main remaining work is release hardening, demo readiness, and documentation accuracy.

## Immediate Next Execution Steps

1. Execute the stories in [`PROJECT_PLAN.md`](PROJECT_PLAN.md) starting with prototype bootstrap, demo seed data, and UI hardening.
2. Keep `README.md` and `V1_SCOPE_FREEZE.md` synchronized with the stories marked `done`.
3. Do not expand scope into HR, inventory, CRM pipeline, MCP, or worker-split work until the prototype checklist is complete.

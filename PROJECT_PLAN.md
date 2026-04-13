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

## Epic Overview

| Epic | Name | Outcome | Status |
|---|---|---|---|
| `ARCA-E1` | Prototype Bootstrap | Clean local startup and smoke verification from a fresh checkout | `todo` |
| `ARCA-E2` | Operator Access | Frontend login/session flow replaces manual token-only usage | `todo` |
| `ARCA-E3` | Finance + Approval UX | Finance and approval flows are usable as a prototype demo without raw API knowledge | `todo` |
| `ARCA-E4` | Projects + Documents UX | Project/story/document flows are coherent and demo-ready in the UI | `todo` |
| `ARCA-E5` | Release Readiness | Docs, checklists, and prototype evidence stay aligned with the repo | `in_progress` |

## Epic Backlog

### `ARCA-E1` Prototype Bootstrap

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-001` | `todo` | As a contributor, I want a verified local bootstrap path so I can start the system from a clean checkout without guessing. | Validate `.env.example`; verify `docker compose up --build -d`; verify migration path against `data/sqlite/arca.db`; document exact commands and failure modes in `README.md`. | 3 | None | Unassigned | None | Use existing DB path safety guidance in `README.md`. |
| `ARCA-US-002` | `todo` | As a demo operator, I want reproducible seed data so I can exercise contacts, finance, projects, and approvals immediately. | Add idempotent seed script(s) for bootstrap admin, sample contacts, one project, one sprint, one story, one invoice, and one approval rule; keep canonical paths under `scripts/`; document how to reset/reseed. | 5 | `ARCA-US-001` | Unassigned | None | Existing `scripts/seed-spend-approval.sql` is a starting point only. |
| `ARCA-US-003` | `todo` | As another agent, I want a smoke-test command so I can verify the prototype before or after making changes. | Add a non-interactive smoke test that hits health, login, at least one create/list flow, and audit verification; document expected success output; make it runnable from repo root. | 5 | `ARCA-US-001`, `ARCA-US-002` | Unassigned | None | Favor shell or Node tooling already used in the repo. |

### `ARCA-E2` Operator Access

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-101` | `todo` | As an operator, I want to log in from the frontend so I do not need to paste a JWT manually. | Use existing `/api/v1/auth/login`; add login form, success/error handling, logout, and token persistence; preserve agent-key/manual token entry as an advanced fallback, not the primary path. | 5 | `ARCA-US-001` | Unassigned | None | Current manual token state lives in `frontend/src/App.jsx`. |
| `ARCA-US-102` | `todo` | As an operator, I want the UI to make session state obvious so I know whether actions will work before submitting forms. | Show active auth mode, token/session expiry-safe state, disabled states when unauthenticated, and clear empty/error banners; keep the current localStorage pattern or replace it consistently. | 3 | `ARCA-US-101` | Unassigned | None | Pairs naturally with the existing toast and status components. |

### `ARCA-E3` Finance + Approval UX

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-201` | `todo` | As a finance operator, I want complete invoice/payment/journal workflows in the UI so I can run the finance demo without Postman. | Ensure create + list/report coverage for invoices, payments, and journal entries; wire success/error states to toasts; surface report data clearly; keep payload mapping consistent with `backend/src/api/finance.routes.js`. | 8 | `ARCA-US-101` | Unassigned | None | Backend is already implemented and tested. |
| `ARCA-US-202` | `todo` | As an approver, I want waiting approval tasks to be easy to spot and act on so I can resume blocked finance work quickly. | Add filtered waiting-approval task views, approve/reject affordances, clear task context, and automatic refresh from `arca:event`; support both optimistic refresh and manual reload fallback. | 5 | `ARCA-US-101`, `ARCA-US-201` | Unassigned | None | Approval engine is already in backend/service tests. |
| `ARCA-US-203` | `todo` | As a demo setup owner, I want a manageable spend-approval configuration path so prototype setup does not require reading SQL blindly. | Either add a minimal admin CRUD path for approval rules or make the seed/setup path explicit and discoverable in docs/scripts; whichever path is chosen must be reflected in `README.md` and smoke test docs. | 5 | `ARCA-US-002` | Unassigned | None | Current repo has migration + seed SQL but no management endpoint/UI. |

### `ARCA-E4` Projects + Documents UX

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-301` | `todo` | As a project operator, I want project, sprint, and story flows to feel connected so I can demo planning end-to-end. | Improve project creation, sprint creation, story creation, token estimation, and burndown visibility in the UI; keep field names aligned to `backend/src/api/projects.routes.js` and `/tokens/*` endpoints. | 5 | `ARCA-US-101` | Unassigned | None | Current backend shape is stable and tested. |
| `ARCA-US-302` | `todo` | As an operator, I want document workflows to show storage outcome so I know whether a file landed in Nextcloud or local offline mode. | Surface document metadata and upload result state, improve document list/delete affordances, and keep offline/remote behavior understandable without reading backend logs. | 5 | `ARCA-US-101` | Unassigned | None | The documents service already records metadata including offline mode. |
| `ARCA-US-303` | `todo` | As an operator, I want module navigation to reflect actual v1 scope so I do not assume missing modules are broken. | Keep nav limited to current v1 modules, clarify deferred modules in copy, and avoid placeholders for HR/inventory/CRM pipeline/MCP. | 2 | `ARCA-US-101` | Unassigned | None | Scope discipline matters as much as feature completeness. |

### `ARCA-E5` Release Readiness

| ID | Status | User story | Technical requirements | SP | Dependencies | Owner | Blockers | Notes |
|---|---|---|---|---:|---|---|---|---|
| `ARCA-US-401` | `done` | As a contributor, I want the repository docs to match the actual codebase so I can trust the stated v1 scope. | Align `README.md` and `V1_SCOPE_FREEZE.md` with implemented repo state; stop over-claiming deferred modules; add a file-purpose map and explicit v1 source-of-truth docs. | 3 | None | Current turn | None | Completed in this change set. |
| `ARCA-US-402` | `done` | As another agent, I want a tracked execution backlog so I can continue work without repository archaeology. | Create `PROJECT_PLAN.md` with epics, story IDs, technical requirements, story points, dependencies, and execution rules. | 3 | None | Current turn | None | Completed in this change set. |
| `ARCA-US-403` | `todo` | As a release owner, I want a prototype exit checklist so I can decide when `v1` is demo-ready. | Add a concise release checklist covering bootstrap, smoke test, core UI walkthrough, audit verify, backup path, and docs alignment; link it from `README.md` or this plan. | 3 | `ARCA-US-001`, `ARCA-US-003`, `ARCA-US-201`, `ARCA-US-301`, `ARCA-US-302` | Unassigned | None | Keep it short and binary. |

## Recommended Execution Order

1. Finish `ARCA-E1` first. A reliable bootstrap path reduces guesswork for every later story.
2. Then land `ARCA-E2` so the frontend can exercise the backend without manual token handling.
3. Execute `ARCA-E3` and `ARCA-E4` in parallel where possible because they touch different user-facing flows.
4. Close with `ARCA-E5` to lock in release evidence and keep docs synchronized.

## Non-Goals For v1

- HR employee records, contracts, leave, payroll prep
- Inventory and material master
- Full CRM pipeline beyond current contacts coverage
- MCP endpoint
- BullMQ worker split / queue hardening as a required v1 deliverable
- Advanced analytics dashboards beyond the current reporting endpoints

## Story Point Scale

Use a light Fibonacci scale: `1, 2, 3, 5, 8`.

- `1`: trivial docs/config tweak
- `2-3`: small contained change
- `5`: moderate feature slice touching multiple files
- `8`: substantial but still bounded delivery slice

These points are for planning/handoff only. They do **not** replace the app's token-estimation model used inside the projects module.

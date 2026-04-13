<div align="center">

# ⬡ Arca

**Agent-First ERP for the Modern Solo Operator**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](docker-compose.yml)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite)](documentation.md#18-database--backup)
[![LLM](https://img.shields.io/badge/LLM-Multi--provider-8B5CF6)](documentation.md#5-multi-llm-provider-system)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

*Every record. Every agent. One source of truth.*

[Documentation](documentation.md) · [v1 Scope Freeze](V1_SCOPE_FREEZE.md) · [Project Plan](PROJECT_PLAN.md) · [Quickstart](#quickstart) · [Architecture](#architecture-at-a-glance) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

</div>

---

## What is Arca?

Arca is an open-source, **agent-first ERP foundation** for solo operators and small teams. The current repository already ships a working backend for agent tasks, finance, projects, documents, auth, audit logging, and realtime events, plus a React-based operations console for exercising those flows.

The long-term product vision in `documentation.md` is broader than the codebase today. For the current repository state, treat this `README.md`, [`V1_SCOPE_FREEZE.md`](V1_SCOPE_FREEZE.md), and [`PROJECT_PLAN.md`](PROJECT_PLAN.md) as the authoritative v1 execution documents.

```
Human ──▶ Operator UI / Orchestrator ──▶ Agent API ──▶ Arca REST API
                                                   │
                              ┌────────────────────┼─────────────────────┐
                              ▼                    ▼                     ▼
                       Finance flows        Project flows         Document flows
                       (payments, VAT)      (sprints, tokens)     (Nextcloud/offline)
```

---

## Current v1 Capabilities

| Module | What it does |
|---|---|
| **Authentication** | JWT login, bootstrap admin, admin-managed agent API keys |
| **Agent Tasks** | Task creation, polling, natural-language task entry, approval and resume flow |
| **LLM Routing** | Provider inventory, routing rules, provider test endpoints, usage persistence |
| **Contacts + Documents** | Contact CRUD plus document upload/list/delete with Nextcloud or offline fallback |
| **Finance Core** | Invoices, payments, journal entries, P&L, VAT, open A/R, immutable transaction logging |
| **Spend Approval** | Threshold-based approval rules for agent-initiated finance writes |
| **Projects + Tokens** | Projects, sprints, user stories, token estimation, burndown, budget and forecast endpoints |
| **Realtime Events** | `Socket.IO` event stream for agent, finance, and project activity |
| **Frontend Console** | React/Vite operations shell for token auth, core flows, approvals, and live events |

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│  nginx ──▶ frontend (React + Vite)                              │
│        ──▶ backend  (Node.js 20 + Express + Socket.IO)          │
│               │                                                  │
│               ├── SQLite (WAL, single .db file)                  │
│               ├── Redis  (reserved for queue hardening)          │
│               └── Multi-LLM Router                              │
│                    ├── Anthropic / OpenAI / Groq  (cloud)       │
│                    └── Ollama / LM Studio (external)             │
│                                                                  │
│  External: Ollama (host) · Nextcloud (your server)              │
└──────────────────────────────────────────────────────────────────┘
```

> **Ollama is intentionally NOT inside Docker.** Run it natively on your host for full GPU access. See [External Dependencies](documentation.md#2-external-dependencies).

---

## Current Delivery Status (Verified 2026-04-13)

- Implemented and covered by automated backend tests: auth, agent tasks, LLM routing endpoints, contacts/documents, finance core, projects/tokens, spend approval, realtime event publishing, and audit verification.
- Frontend status: a functional React operations console exists for bearer-token auth, task actions, finance/project/contact/document flows, approval demos, and live event feed consumption.
- Verification run on `2026-04-13`: `backend npm test` passed (`32/32` tests) and `frontend npm run build` passed.
- Deferred post-v1: HR, inventory, full CRM pipeline, MCP endpoint, worker/queue hardening, and advanced analytics.

---

## Documentation Map

| File | Purpose |
|---|---|
| [`README.md`](README.md) | Entry point for the repository: what is implemented, how to run it, and where the v1 source-of-truth docs live |
| [`V1_SCOPE_FREEZE.md`](V1_SCOPE_FREEZE.md) | Release contract for what belongs in `v1` and what is explicitly deferred |
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | Execution backlog with epics, stories, technical requirements, story points, and handoff notes for another agent |
| [`documentation.md`](documentation.md) | Broad technical/product vision and reference material; useful context, but broader than the current shippable v1 subset |
| [`SECURITY.md`](SECURITY.md) | Vulnerability disclosure process and security focus areas |

---

## Quickstart

### Prerequisites

- Docker + Docker Compose
- Ollama running on your host ([install](https://ollama.com/download)) — optional but free
- A Nextcloud instance — optional, for document storage
- At least one LLM API key (Anthropic, OpenAI, or Groq)

### 1. Clone

```bash
git clone https://github.com/your-org/arca.git
cd arca
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — add your API keys and Nextcloud credentials
```

### 3. Verify Ollama (optional)

```bash
ollama serve &
docker run --rm curlimages/curl curl -s http://host.docker.internal:11434/api/tags
```

### 4. Start

```bash
docker compose up --build -d
docker compose exec backend npm run db:migrate
open http://localhost
```

> Bootstrap admin comes from `BOOTSTRAP_ADMIN_*` env vars and is created lazily on first auth lookup.

---

## DB Path + Migration Safety

Arca uses SQLite, so the migration target DB path must be explicit and consistent.

- Canonical DB location: `data/sqlite/arca.db`
- Recommended migration command:

```bash
cd backend
DATABASE_PATH=/absolute/path/to/arca/data/sqlite/arca.db npm run db:migrate
```

- Why this matters: running commands from different working directories can accidentally create/use a second DB file (for example `backend/data/sqlite/arca.db`), causing migration drift.

### Safe migration workflow

1. Back up first:

```bash
cp data/sqlite/arca.db data/backups/arca_pre_migrate_$(date +%Y%m%d_%H%M%S).db
```

2. Run migration against the canonical DB path.
3. If you see `Applied migration(s) changed on disk`, stop and verify:
- You are targeting the correct DB file
- The checksum in `schema_migrations` for that file matches the migration file on disk
- You are not mixing two different DB files from different working directories

For spend-approval policy seeding, you can use:

```bash
sqlite3 data/sqlite/arca.db < scripts/seed-spend-approval.sql
```

---

## Token-Based Sprint Planning

Arca replaces story points with **token estimates** — because your developers are agents.

```
US-032  Offline Mode & Sync Engine
        Est: 520k tok  |  Model: claude-sonnet-4  |  Cost: ~$1.56
        Status: IN PROGRESS

Sprint Budget:  2,400,000 tokens  ≈  $8.50
Sprint Actual:  1,690,000 tokens     $3.94  (efficiency: 94%)
```

Token velocity improves over time as agents build semantic memory of the codebase.

---

## Multi-Agent Orchestration

Arca currently exposes a REST API for orchestration. MCP is intentionally deferred from `v1`; any agent framework that can call HTTP endpoints can drive the current prototype.

```python
import requests

resp = requests.post("http://localhost/api/v1/agents/nl",
    headers={"Authorization": "Bearer erp_agent_sk_..."},
    json={"instruction": "Close Q1 books and upload board pack to Nextcloud."})

task_id = resp.json()["task_id"]
# poll /api/v1/agents/tasks/{task_id} until done
```

See [Section 7 — Orchestration](documentation.md#7-multi-agent-orchestration--openclaw--cfo-sub-agent) for the broader target architecture, and [`V1_SCOPE_FREEZE.md`](V1_SCOPE_FREEZE.md) for the actual shipped v1 boundary.

---

## Audit Compliance

Every financial booking writes to an **immutable, hash-chained transaction log**. Every agent and human action writes to an **immutable system log**. Neither can be updated or deleted — SQL triggers enforce this at the database level.

```bash
# Verify hash chain integrity at any time
docker compose exec backend npm run audit:verify -- --table transaction_log
# → Entries: 4,821 | Gaps: 0 | Chain breaks: 0 | ✅ Intact
```

---

## Supported LLM Providers

| Provider | Type | Notes |
|---|---|---|
| Anthropic | Cloud | Default high-reasoning provider in the current config |
| OpenAI | Cloud | Supported through provider configuration |
| Groq | Cloud | Supported for lower-latency routed tasks |
| **Ollama** | **Local (external)** | Local/confidential fallback and coding-friendly models |
| LM Studio | Local | Supported as a local OpenAI-compatible endpoint |
| Any OpenAI-compatible | Custom | Can be integrated through the same provider abstraction |

Auto-routing directs confidential data to local models and complex reasoning tasks to capable cloud models.

---

## Project Structure

```
arca/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── api/                  ← Express routes for auth, agents, contacts, docs, finance, projects, tokens
│       ├── config/               ← environment and runtime settings
│       ├── db/                   ← SQLite client, migrations, migration tooling
│       ├── middleware/           ← auth and scope enforcement
│       ├── modules/              ← agents, audit, auth, contacts, documents, finance, llm, projects, tokens
│       ├── realtime/             ← event bus + Socket.IO bridge
│       └── __tests__/            ← backend verification harness and module tests
├── frontend/
│   ├── Dockerfile
│   └── src/                      ← React operations console
├── data/
│   ├── backups/                  ← SQLite backups
│   ├── sqlite/                   ← canonical database location
│   └── uploads/                  ← local/offline document storage
├── documentation.md              ← broader system vision and reference
├── V1_SCOPE_FREEZE.md            ← v1 release boundary
├── PROJECT_PLAN.md               ← execution plan and story backlog
├── scripts/
│   ├── backup.sh                 ← nightly SQLite backup
│   └── seed-spend-approval.sql   ← sample approval rule seed
├── CHANGELOG.md
├── SECURITY.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Post-v1 Roadmap

The list below is intentionally longer-term. For the concrete v1 finish line and next execution steps, use [`PROJECT_PLAN.md`](PROJECT_PLAN.md).

- [ ] Email invoice parsing (IMAP → OCR → auto-book AP)
- [ ] Open Banking sync (Plaid / Nordigen / FinTS)
- [ ] MCP server endpoint (expose all ERP actions as MCP tools)
- [ ] Agent marketplace (community-built automation workflows)
- [ ] Mobile PWA (offline + push notifications)
- [ ] Predictive cashflow (13-week rolling model)
- [ ] Multi-currency & FX auto-booking
- [ ] Semantic ERP search (vector + full-text)

See [Recommended Extensions](documentation.md#20-recommended-extensions) for the full prioritised list.

---

## Contributing

Contributions are welcome — bug reports, feature requests, documentation, and code.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

*Arca · Open Source · MIT License · Repository snapshot aligned on 2026-04-13*

*Built for the era when your CFO is an agent and your developers work in tokens.*

</div>

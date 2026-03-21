<div align="center">

# ⬡ Arca

**Agent-First ERP for the Modern Solo Operator**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](docker-compose.yml)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite)](docs/documentation.md#18-database--backup)
[![LLM](https://img.shields.io/badge/LLM-Multi--provider-8B5CF6)](docs/documentation.md#5-multi-llm-provider-system)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

*Every record. Every agent. One source of truth.*

[Documentation](docs/documentation.md) · [Quickstart](#quickstart) · [Architecture](#architecture) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

</div>

---

## What is Arca?

Arca is a fully open-source, **agentic ERP system** built for solo entrepreneurs and small teams. It is designed to be operated primarily by AI agents while retaining a full human UI inspired by SAP Fiori.

Think of it as the financial, operational, and project backbone of your business — one where your AI agents close invoices, reconcile bank statements, manage sprint backlogs, and file documents to Nextcloud while you focus on the work that actually requires you.

```
Human ──▶ Orchestrator ──▶ CFO Agent ──▶ Arca REST API / MCP
                                               │
                          ┌────────────────────┼─────────────────────┐
                          ▼                    ▼                     ▼
                   Finance Agent        Project Agent         Docs Agent
                   (invoices, VAT)      (sprints, tokens)     (Nextcloud)
```

---

## Key Features

| Module | What it does |
|---|---|
| **Financial Accounting** | Double-entry bookkeeping, invoices, payments, VAT, DATEV export |
| **CRM & Sales Funnel** | Lead management, Kanban pipeline, offers, deal conversion |
| **Project Management** | Classic projects + Agile/Scrum with token-based sprint planning |
| **Inventory** | Material master, stock movements, reorder alerts, ABC analysis |
| **HR Module** | Employee records, contracts, leave management, payroll preparation |
| **Nextcloud Docs** | Every record can attach documents — stored in your own Nextcloud |
| **Multi-LLM Router** | Anthropic, OpenAI, Groq, Ollama (external), LM Studio — auto-routed |
| **Audit Logs** | Immutable system log + transaction log with SHA-256 hash chain |
| **Agent Orchestration** | OpenClaw / CFO sub-agent compatible, MCP server endpoint included |

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│  nginx ──▶ frontend (React + SAP UI5)                           │
│        ──▶ backend  (Node.js 20 + Express)                      │
│               │                                                  │
│               ├── SQLite (WAL, single .db file)                  │
│               ├── Redis  (BullMQ agent queue)                    │
│               └── Multi-LLM Router                              │
│                    ├── Anthropic / OpenAI / Groq  (cloud)       │
│                    └── Ollama  ← YOUR HOST (external)            │
│                                                                  │
│  External: Ollama (host) · Nextcloud (your server)              │
└──────────────────────────────────────────────────────────────────┘
```

> **Ollama is intentionally NOT inside Docker.** Run it natively on your host for full GPU access. See [External Dependencies](docs/documentation.md#2-external-dependencies).

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
docker compose exec backend npm run create-admin
open http://localhost
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

Arca exposes a full REST API and an optional MCP server endpoint. Any orchestration framework — OpenClaw, CrewAI, AutoGen, LangGraph — can drive it.

```python
import requests

resp = requests.post("http://localhost/api/v1/agents/nl",
    headers={"Authorization": "Bearer erp_agent_sk_..."},
    json={"instruction": "Close Q1 books and upload board pack to Nextcloud."})

task_id = resp.json()["task_id"]
# poll /api/v1/agents/tasks/{task_id} until done
```

See [Section 7 — Orchestration](docs/documentation.md#7-multi-agent-orchestration--openclaw--cfo-sub-agent) for the full CFO sub-agent pattern.

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

| Provider | Type | Models |
|---|---|---|
| Anthropic | Cloud | claude-opus-4, claude-sonnet-4, claude-haiku |
| OpenAI | Cloud | gpt-4o, gpt-4o-mini, o1 |
| Groq | Cloud | llama3-70b, mixtral-8x7b |
| **Ollama** | **Local (external)** | llama3.1, qwen2.5-coder, mistral, codestral |
| LM Studio | Local | any GGUF model |
| Any OpenAI-compat. | Custom | vLLM, Together AI, etc. |

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
│       ├── agents/
│       │   ├── broker.js         ← BullMQ task queue
│       │   ├── router.js         ← LLM routing logic
│       │   └── providers/        ← anthropic / openai / groq / ollama
│       ├── modules/              ← finance / crm / projects / hr / inventory
│       ├── api/                  ← Express routes
│       └── db/                   ← SQLite migrations & schema
├── frontend/
│   ├── Dockerfile
│   └── src/                      ← React 18 + SAP UI5 Web Components
├── docs/
│   └── documentation.md          ← Full technical documentation (v1.0)
├── scripts/
│   └── backup.sh                 ← Nightly SQLite backup
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Roadmap

- [ ] Email invoice parsing (IMAP → OCR → auto-book AP)
- [ ] Open Banking sync (Plaid / Nordigen / FinTS)
- [ ] MCP server endpoint (expose all ERP actions as MCP tools)
- [ ] Agent marketplace (community-built automation workflows)
- [ ] Mobile PWA (offline + push notifications)
- [ ] Predictive cashflow (13-week rolling model)
- [ ] Multi-currency & FX auto-booking
- [ ] Semantic ERP search (vector + full-text)

See [Recommended Extensions](docs/documentation.md#20-recommended-extensions) for the full prioritised list.

---

## Contributing

Contributions are welcome — bug reports, feature requests, documentation, and code.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

*Arca · Open Source · MIT License · v1.0 · March 2026*

*Built for the era when your CFO is an agent and your developers work in tokens.*

</div>

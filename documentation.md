# Arca — Technical Documentation & User Guide

> **Version 1.0** · Agent-First ERP · Multi-LLM · Token-Based Planning · Docker-native · Nextcloud Integration · SAP Fiori UI · OpenClaw / CFO Orchestration · Audit-Grade Logging · HR Module
>
> **Changelog v2.2:** Added immutable system log (agent activity) · Added transaction log (every ERP booking, audit-grade) · High-level audit compliance documentation · Added HR module for small teams (employees, contracts, leave, payroll prep, org chart)
>
> **Changelog v2.1:** Ollama moved to external dependency · Added multi-agent orchestration chapter (OpenClaw + CFO sub-agent) · Spend-approval governance hook

---

## Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [External Dependencies](#2-external-dependencies)
3. [Docker Setup & Deployment](#3-docker-setup--deployment)
4. [Authentication & User Management](#4-authentication--user-management)
5. [Multi-LLM Provider System](#5-multi-llm-provider-system)
6. [Agent Infrastructure](#6-agent-infrastructure)
7. [Multi-Agent Orchestration — OpenClaw + CFO Sub-Agent](#7-multi-agent-orchestration--openclaw--cfo-sub-agent)
8. [UI/UX — SAP Fiori Design System](#8-uiux--sap-fiori-design-system)
9. [Dashboard & Navigation](#9-dashboard--navigation)
10. [Master Data — Debtors & Creditors](#10-master-data--debtors--creditors)
11. [Material Master & Inventory](#11-material-master--inventory)
12. [Financial Accounting](#12-financial-accounting)
13. [Sales Funnel & CRM](#13-sales-funnel--crm)
14. [Project Management & Agile Development](#14-project-management--agile-development)
15. [Token-Based Sprint Planning](#15-token-based-sprint-planning)
16. [Nextcloud Document Integration](#16-nextcloud-document-integration)
17. [Reports & Analytics Dashboards](#17-reports--analytics-dashboards)
18. [Database & Backup](#18-database--backup)
19. [Agent API Reference](#19-agent-api-reference)
20. [Recommended Extensions](#20-recommended-extensions)
21. [Audit & Transaction Logs](#21-audit--transaction-logs)
22. [HR Module — Small Teams](#22-hr-module--small-teams)
23. [Glossary](#23-glossary)

---

## 1. System Overview & Architecture

Arca is a fully containerized, AI-native ERP system designed from the ground up for **autonomous agents as primary operators**, while maintaining a full-featured human UI inspired by SAP Fiori.

```
┌──────────────────────────────────────────────────────────────────────┐
│              Arca v2 — System Architecture                │
│                                                                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                   │
│  │  Human UI  │   │ Agent API  │   │ Nextcloud  │                   │
│  │ (React +   │   │ REST/WS    │   │  WebDAV    │                   │
│  │ SAP UI5)   │   │ + MCP      │   │            │                   │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘                   │
│        └────────────────┼────────────────┘                          │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │        API Gateway (Express.js + Nginx)                  │       │
│  │     JWT Auth · Agent API Keys · Rate Limiting            │       │
│  └─────────────────────────┬────────────────────────────────┘       │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              Multi-LLM Router                            │       │
│  │  Anthropic · OpenAI · Groq · Ollama · LM Studio · Any   │       │
│  └─────────────────────────┬────────────────────────────────┘       │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    ERP Core Engine                       │       │
│  │  Finance · CRM · Projects · Agile · Inventory · Docs     │       │
│  └────┬────────────────────┬──────────────────────┬─────────┘       │
│       ▼                    ▼                      ▼                  │
│  ┌─────────┐   ┌────────────────────┐   ┌──────────────┐            │
│  │ SQLite  │   │  Agent Broker      │   │  Event Bus   │            │
│  │  (WAL)  │   │ (BullMQ + Redis)   │   │  (Socket.io) │            │
│  └─────────┘   └────────────────────┘   └──────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Container | Docker + Docker Compose |
| Backend | Node.js 20 + Express.js |
| Database | SQLite 3 (WAL-Mode, single file) |
| Frontend | React 18 + SAP UI5 Web Components |
| LLM Providers | Anthropic, OpenAI, Groq, Ollama, LM Studio, any OpenAI-compatible |
| Authentication | JWT + bcrypt + Passport.js |
| Document Storage | Nextcloud (WebDAV protocol) |
| Real-time | WebSocket via Socket.io |
| Agent Queue | BullMQ + Redis |
| Reverse Proxy | Nginx Alpine |
| OCR | Tesseract.js |
| Vector Memory | SQLite-VSS (agent semantic memory) |

---

## 2. External Dependencies

Arca intentionally keeps its Docker stack lean. The following services run **outside** the Docker Compose stack and must be provisioned separately before starting the application.

### 2.1 Ollama (Local LLM — External)

Ollama runs on your **host machine** (or any reachable server), not inside Docker. This gives you full GPU access, model management via the Ollama CLI, and lets you share the same Ollama instance across multiple projects.

> **Why external?** Docker cannot access host GPU drivers cleanly on all platforms. Running Ollama natively on the host gives the best performance, avoids NVIDIA Container Toolkit complexity, and keeps the stack simple.

**Step 1 — Install Ollama on your host**

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer from https://ollama.com/download
```

**Step 2 — Pull the models you want**

```bash
# Recommended defaults
ollama pull llama3.1          # General-purpose, 8B, fast
ollama pull qwen2.5-coder     # Code generation tasks
ollama pull mistral           # Lightweight alternative

# Verify running
ollama list
ollama serve   # starts on port 11434 by default
```

**Step 3 — Make Ollama reachable from Docker**

By default Ollama only listens on `127.0.0.1`. You must bind it to all interfaces so the backend container can reach it:

```bash
# Option A: environment variable (recommended)
OLLAMA_HOST=0.0.0.0 ollama serve

# Option B: set permanently via systemd (Linux)
sudo systemctl edit ollama.service
# Add under [Service]:
# Environment="OLLAMA_HOST=0.0.0.0"
sudo systemctl restart ollama
```

**Step 4 — Set the URL in `.env`**

```bash
# .env
# On Linux/Windows host:
OLLAMA_BASE_URL=http://host.docker.internal:11434

# If host.docker.internal doesn't resolve (some Linux Docker versions):
# Find your host IP: ip route | awk 'NR==1{print $3}'
OLLAMA_BASE_URL=http://172.17.0.1:11434
```

**Verify connectivity from inside the container:**

```bash
docker compose exec backend curl http://host.docker.internal:11434/api/tags
# Expected: { "models": [ ... ] }
```

### 2.2 Nextcloud (Document Storage — External)

Your own Nextcloud instance running anywhere (self-hosted, managed, or a friend's server). Arca connects via **WebDAV** using an app-specific password.

- Minimum version: Nextcloud 25
- Required: a dedicated service account (e.g. `erp-service`) with its own app password
- The base folder `/ERP-Documents` will be created automatically on first use

See [Section 16 — Nextcloud Document Integration](#16-nextcloud-document-integration) for full configuration.

### 2.3 External Dependency Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   Dependency Overview                        │
│                                                             │
│  INSIDE Docker Compose          OUTSIDE Docker Compose      │
│  ─────────────────────          ───────────────────────     │
│  ✅ nginx (reverse proxy)        🔗 Ollama  (your host)     │
│  ✅ backend (Node.js API)        🔗 Nextcloud (your server) │
│  ✅ frontend (React)             ☁  Anthropic API (cloud)   │
│  ✅ redis (task queue)           ☁  Groq API     (cloud)    │
│  ✅ backup-cron                  ☁  OpenAI API   (cloud)    │
│  ✅ SQLite data volume                                       │
└─────────────────────────────────────────────────────────────┘
```

Cloud LLM providers (Anthropic, Groq, OpenAI) are also external — they only require API keys in `.env` and no additional setup.

---

## 3. Docker Setup & Deployment

### 3.1 Directory Structure

```
solo-erp/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── agents/
│       │   ├── broker.js
│       │   ├── router.js        ← LLM routing logic
│       │   └── providers/
│       │       ├── anthropic.js
│       │       ├── openai.js
│       │       ├── ollama.js
│       │       └── groq.js
│       ├── modules/
│       ├── api/
│       └── db/
├── frontend/
│   ├── Dockerfile
│   └── src/
└── data/
    ├── sqlite/
    ├── uploads/
    └── backups/
```

### 3.2 docker-compose.yml

```yaml
version: '3.9'

services:

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on: [backend, frontend]
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/sqlite/arca.db
      - JWT_SECRET=${JWT_SECRET}
      # LLM Providers (configure as needed)
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      # Ollama runs on your HOST — not inside Docker (see Section 2: External Dependencies)
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL}   # e.g. http://host.docker.internal:11434
      - LM_STUDIO_BASE_URL=${LM_STUDIO_BASE_URL}
      # Nextcloud
      - NEXTCLOUD_URL=${NEXTCLOUD_URL}
      - NEXTCLOUD_USER=${NEXTCLOUD_USER}
      - NEXTCLOUD_PASSWORD=${NEXTCLOUD_PASSWORD}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/data
    depends_on: [redis]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  # NOTE: Ollama is intentionally NOT included here.
  # Run Ollama natively on your host for full GPU access and shared model storage.
  # See Section 2.1 (External Dependencies) for setup instructions.

  backup-cron:
    build:
      context: ./backend
      dockerfile: Dockerfile.backup
    volumes:
      - ./data:/data
    environment:
      - BACKUP_RETENTION_DAYS=30
    restart: unless-stopped

volumes:
  redis_data:
```

### 3.3 Environment Configuration (.env)

```bash
# ── Security ───────────────────────────────────────────
JWT_SECRET=your-256-bit-random-secret
JWT_EXPIRES_IN=8h
AGENT_KEY_SECRET=separate-secret-for-agent-keys

# ── LLM Providers (add only those you use) ─────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
# Ollama — external, running on your host (see Section 2.1)
# On macOS/Windows Docker Desktop:
OLLAMA_BASE_URL=http://host.docker.internal:11434
# On Linux (if host.docker.internal doesn't resolve):
# OLLAMA_BASE_URL=http://172.17.0.1:11434
# LM Studio runs locally — point to its server port
LM_STUDIO_BASE_URL=http://host.docker.internal:1234

# ── LLM Routing Policy ─────────────────────────────────
LLM_DEFAULT_PROVIDER=anthropic
LLM_DEFAULT_MODEL=claude-sonnet-4-20250514
LLM_FALLBACK_PROVIDER=ollama
LLM_FALLBACK_MODEL=llama3.1
LLM_CONFIDENTIAL_PROVIDER=ollama     # Force local for sensitive data
LLM_COST_THRESHOLD_USD=0.50          # Auto-fallback if task exceeds this

# ── Token Budget ────────────────────────────────────────
TOKEN_SPRINT_BUDGET=2400000          # Default tokens per sprint
TOKEN_TASK_MAX=500000                # Max tokens per single task
TOKEN_WARN_THRESHOLD=0.85            # Warn at 85% budget used

# ── Nextcloud ───────────────────────────────────────────
NEXTCLOUD_URL=https://nextcloud.yourdomain.com
NEXTCLOUD_USER=erp-service-user
NEXTCLOUD_PASSWORD=your-app-password
NEXTCLOUD_BASE_PATH=/ERP-Documents

# ── Company ─────────────────────────────────────────────
COMPANY_NAME="Jane Smith Consulting"
COMPANY_TAX_ID=US-EIN-12-3456789
FISCAL_YEAR_START=01-01
BASE_CURRENCY=USD
```

### 3.4 Quickstart

```bash
# 1. Ensure Ollama is running on your host (see Section 2.1)
ollama serve &          # skip if already running as a service
ollama list             # confirm models are available

# 2. Clone or initialize the project
git clone https://github.com/your-org/arca
cd arca

# 3. Configure environment
cp .env.example .env
nano .env   # Fill in your keys; set OLLAMA_BASE_URL to your host

# 4. Verify Ollama is reachable from Docker (optional but recommended)
docker run --rm curlimages/curl curl -s http://host.docker.internal:11434/api/tags

# 5. Build and start all containers
docker compose up --build -d

# 6. Run database migrations
docker compose exec backend npm run db:migrate

# 7. Create the first admin user
docker compose exec backend npm run create-admin

# 8. Open in browser
open http://localhost
```

---

## 4. Authentication & User Management

### 4.1 Login Screen (Mockup)

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Arca  ·  v2.0                       ║
║              Agent-First · Multi-LLM · Open Source          ║
║                                                              ║
║        ┌────────────────────────────────────────┐           ║
║        │  Username / Email                      │           ║
║        ├────────────────────────────────────────┤           ║
║        │  Password                              │           ║
║        ├────────────────────────────────────────┤           ║
║        │  [ ] Remember me                       │           ║
║        │                                        │           ║
║        │  ╔══════════════════════════════════╗  │           ║
║        │  ║          SIGN IN  →              ║  │           ║
║        │  ╚══════════════════════════════════╝  │           ║
║        │                                        │           ║
║        │  ──────── or ─────────                 │           ║
║        │  Agent API Key  |  OIDC / SSO           │           ║
║        └────────────────────────────────────────┘           ║
╚══════════════════════════════════════════════════════════════╝
```

### 3.2 User Roles

| Role | Description | Permissions |
|---|---|---|
| `admin` | System administrator | Full access + user management |
| `user` | Standard human user | All modules, no system settings |
| `agent` | AI agent (API-only) | Full programmatic access via API key |
| `readonly` | Viewer (e.g., accountant) | Reports, journal, exports only |
| `external` | Tax advisor, auditor | DATEV export, read-only ledger |

### 3.3 Agent API Keys

Agents authenticate via long-lived API keys — no password required:

```bash
# Create an API key for an agent (admin endpoint)
POST /api/v1/auth/agent-keys
{
  "name": "Finance Agent",
  "scopes": ["finance:write", "contacts:read", "documents:write"],
  "expires_at": null,
  "preferred_llm_provider": "ollama",
  "preferred_llm_model": "llama3.1",
  "token_budget_per_day": 500000
}

# Response:
{
  "key": "erp_agent_sk_...",
  "key_id": "ak_01J...",
  "name": "Finance Agent",
  "token_budget_per_day": 500000
}
```

---

## 5. Multi-LLM Provider System

One of the core differentiators of Arca v2 is **provider-agnostic LLM routing**. Every agent can use a different model, and the system automatically selects the optimal provider based on task type, cost, latency, and data sensitivity.

### 5.1 Supported Providers

| Provider | Type | Models | Notes |
|---|---|---|---|
| **Anthropic** | Cloud | claude-opus-4, claude-sonnet-4, claude-haiku | Best for complex reasoning |
| **OpenAI** | Cloud | gpt-4o, gpt-4o-mini, o1, o3 | Broad capability |
| **Groq** | Cloud | llama3-70b, mixtral-8x7b | Ultra-fast inference |
| **Ollama** | Local | llama3.1, qwen2.5, mistral, codestral | Free, private, offline |
| **LM Studio** | Local | Any GGUF model | Desktop GUI for local models |
| **Any OpenAI-compat.** | Custom | Configurable | Self-hosted vLLM, Together AI, etc. |

### 5.2 Universal LLM Adapter (Code)

```javascript
// backend/src/agents/providers/llm-adapter.js

const PROVIDERS = {
  anthropic: require('./anthropic'),
  openai:    require('./openai'),
  groq:      require('./groq'),
  ollama:    require('./ollama'),
  lm_studio: require('./lm-studio'),
};

class LLMAdapter {
  async complete(prompt, options = {}) {
    const provider = this.resolveProvider(options);
    const model    = this.resolveModel(provider, options);

    // Track token usage
    const startTime = Date.now();
    const result = await PROVIDERS[provider].complete(prompt, { model, ...options });

    await tokenTracker.record({
      provider, model,
      inputTokens:  result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      costUsd:      this.calculateCost(provider, model, result.usage),
      taskId:       options.taskId,
      sprintId:     options.sprintId,
      latencyMs:    Date.now() - startTime,
    });

    return result;
  }

  resolveProvider(options) {
    // 1. Explicit override wins
    if (options.provider) return options.provider;

    // 2. Data sensitivity check → force local
    if (options.confidential) return process.env.LLM_CONFIDENTIAL_PROVIDER;

    // 3. Task-type routing
    const routes = {
      architecture: 'anthropic',
      code_review:  'anthropic',
      data_entry:   'groq',
      bulk_ops:     'ollama',
      default:      process.env.LLM_DEFAULT_PROVIDER,
    };
    return routes[options.taskType] || routes.default;
  }

  calculateCost(provider, model, usage) {
    const PRICING = {
      'anthropic/claude-opus-4':     { in: 15.00, out: 75.00 },
      'anthropic/claude-sonnet-4':   { in:  3.00, out: 15.00 },
      'openai/gpt-4o':               { in:  2.50, out: 10.00 },
      'groq/llama3-70b':             { in:  0.07, out:  0.08 },
      'ollama/*':                    { in:  0.00, out:  0.00 },
      'lm_studio/*':                 { in:  0.00, out:  0.00 },
    };
    const key = `${provider}/${model}`;
    const price = PRICING[key] || PRICING[`${provider}/*`] || { in: 0, out: 0 };
    return ((usage.input_tokens * price.in) + (usage.output_tokens * price.out)) / 1_000_000;
  }
}
```

### 5.3 Routing Rules Configuration (UI Mockup)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  Settings  │  LLM Provider Configuration                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Active Providers                                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  ✅ Anthropic   claude-sonnet-4   [Test Connection]   [Edit]    │    ║
║  │  ✅ Groq        llama3-70b        [Test Connection]   [Edit]    │    ║
║  │  ✅ Ollama      llama3.1 + qwen2  [Test Connection]   [Edit]    │    ║
║  │  ⬜ OpenAI     (not configured)   [+ Add Provider]              │    ║
║  │  ⬜ LM Studio  (not configured)   [+ Add Provider]              │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                          ║
║  Routing Rules  (drag to reorder)                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  1  IF  task_type = architecture      THEN  claude-opus-4       │    ║
║  │  2  IF  data_sensitivity = high       THEN  ollama/llama3.1     │    ║
║  │  3  IF  estimated_tokens > 500k       THEN  ollama/llama3.1     │    ║
║  │  4  IF  task_type = code_generation   THEN  ollama/qwen2.5-cod  │    ║
║  │  5  IF  latency_required = fast       THEN  groq/llama3-70b     │    ║
║  │  6  DEFAULT                           THEN  claude-sonnet-4     │    ║
║  │  ─────────────────────────────────────────────────────────────  │    ║
║  │  FALLBACK (on error / quota exceeded) →  ollama/llama3.1        │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                          ║
║  Monthly Token Budget:  [5,000,000]  tokens   Estimated cost: ~$12      ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Agent Infrastructure

### 6.1 Agent Activity Monitor (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  Agents  │  Activity Monitor                            [Live] ●        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  RUNNING AGENTS                                                          ║
║  ┌────────────────────────────────────────────────────────────────┐     ║
║  │ Agent            │ Task                │ Model      │ Tok │ t  │     ║
║  ├────────────────────────────────────────────────────────────────┤     ║
║  │ Finance Agent    │ Bank reconciliation │ sonnet-4   │ 42k │ 2m │     ║
║  │ Sales Agent      │ 3 follow-up drafts  │ groq-70b   │ 12k │ 8s │     ║
║  │ Project Agent    │ Sprint 4 planning   │ opus-4     │ 88k │ 4m │     ║
║  │ Document Agent   │ Invoice RE-042→NC   │ llama3.1   │ 8k  │ 1m │     ║
║  └────────────────────────────────────────────────────────────────┘     ║
║                                                                          ║
║  TODAY: 847k tokens used  |  $1.24 cost  |  34 tasks complete           ║
║                                                                          ║
║  RECENT EVENTS                                                           ║
║  14:32 ✅ Finance Agent (sonnet-4, 38k tok): Invoice RE-0041 booked     ║
║  14:28 ✅ Sales Agent (groq, 11k tok): "Acme Corp" → Offer phase        ║
║  14:15 ⚠️  Doc Agent (llama3.1): Nextcloud timeout — retrying (1/3)    ║
║  13:58 ✅ Project Agent (opus-4, 92k tok): Sprint 3 report generated   ║
║  13:45 🔀 Router: task routed from claude-sonnet to ollama (conf.data) ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 6.2 Available Agent Actions

```
FINANCE AGENT
├── create_invoice          Create outgoing invoice
├── post_payment            Book incoming/outgoing payment
├── reconcile_bank          Match bank statements to bookings
├── create_reminder         Generate payment reminder (3-stage dunning)
├── generate_vat_report     Calculate VAT return
├── export_datev            DATEV-format export for accountant
└── classify_expense        AI-classify bank transaction category

SALES AGENT
├── qualify_lead            Assess lead quality (BANT framework)
├── create_offer            Draft and post offer from template
├── update_pipeline         Move deal through funnel stages
├── schedule_followup       Create follow-up task with timing
└── convert_to_customer     Promote lead to debtor master record

PROJECT AGENT
├── create_sprint           Plan sprint with token budget allocation
├── assign_tasks            Distribute user stories to agent pool
├── update_burndown         Record token consumption per story
├── generate_report         Sprint retrospective + burndown PDF
└── estimate_tokens         AI-estimate token cost for a user story

DOCUMENT AGENT
├── upload_to_nextcloud     Store file in structured folder path
├── attach_to_record        Link Nextcloud path to ERP record
├── extract_invoice_data    OCR + parse invoice fields (vendor, amount, date)
└── generate_pdf            Render PDF from template (invoice, offer, report)
```

### 6.3 Natural Language Task Endpoint

```bash
POST /api/v1/agents/nl
Authorization: Bearer erp_agent_sk_...

{
  "instruction": "Create an invoice for Acme Corp for 8 hours consulting
                  at $150/h plus one MacBook Pro. Net 14 days. Upload PDF
                  to Nextcloud.",
  "context": { "module": "finance" },
  "llm_override": { "provider": "anthropic", "model": "claude-sonnet-4" }
}
```

---

## 7. Multi-Agent Orchestration — OpenClaw + CFO Sub-Agent

Arca is fully compatible with hierarchical multi-agent frameworks such as **OpenClaw**, CrewAI, AutoGen, LangGraph, or any custom orchestrator. The recommended pattern is a two-layer hierarchy: a top-level **Orchestrator** that accepts goals from the human, and a specialized **CFO Sub-Agent** that coordinates Arca's internal agent pool.

### 7.1 Architecture Overview

```
Human
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 1 — Orchestrator (OpenClaw / any framework)       │
│  Receives high-level goals · Routes to specialized agents │
│  Model: claude-opus-4 or GPT-4o (your choice)            │
└──────────────────────────────┬───────────────────────────┘
                               │  task + context
                               ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2 — CFO Sub-Agent  (Financial Coordinator)        │
│  Owns: budget approval · spend policy · KPI gating       │
│  Delegates: all data entry, booking, filing to Arca   │
│  API key scopes: finance:* · reports:* · budgets:approve  │
└───────┬──────────────┬──────────────┬────────────────────┘
        │              │              │
        ▼              ▼              ▼
  Finance Agent   Project Agent   Document Agent
  (Arca pool)  (Arca pool)  (Arca pool)
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
            Arca REST API / MCP Server
                       │
                       ▼
             SQLite · Redis · Nextcloud
```

### 7.2 CFO Agent API Key Setup

The CFO Sub-Agent authenticates with its own scoped API key — it can call Arca but cannot exceed its own budget authority:

```bash
POST /api/v1/auth/agent-keys
{
  "name": "CFO Sub-Agent",
  "scopes": [
    "finance:read",
    "finance:write",
    "reports:read",
    "budgets:approve",
    "contacts:read",
    "agents:dispatch"
  ],
  "token_budget_per_day": 1000000,
  "preferred_llm_provider": "anthropic",
  "preferred_llm_model": "claude-opus-4",
  "spend_approval_threshold_usd": 500
}

# Response:
{
  "key": "erp_agent_sk_cfo_...",
  "key_id": "ak_cfo_01J...",
  "name": "CFO Sub-Agent"
}
```

### 7.3 Integration Modes

| Mode | How | Best for |
|---|---|---|
| **REST API** | CFO calls `POST /agents/nl` with natural language instructions | Any orchestration framework, easiest to set up |
| **MCP Server** | Arca exposes all endpoints as MCP tools; CFO uses native tool calls | Claude-based orchestrators, OpenClaw with MCP support |
| **Direct DB read** | CFO agent queries SQLite read-only replica for KPIs | Ultra-low latency reporting without API overhead |
| **WebSocket events** | CFO subscribes to live ERP event stream | Real-time reactive decisions (e.g. payment received → trigger action) |

### 7.4 Example Delegation Flow

A complete orchestrated workflow — the human states a goal once; agents handle everything:

```
Human → Orchestrator:
  "Close the books for Q1 and prepare a board report."

Orchestrator → CFO Agent:
  {
    "tasks": [
      "Reconcile all open AR and AP for January–March",
      "Generate P&L, Balance Sheet, and Cashflow statement",
      "Write a one-page executive summary with key findings",
      "Upload board pack PDF to Nextcloud /ERP-Documents/Board/"
    ]
  }

CFO Agent → Arca API:
  POST /agents/nl  { instruction: "Reconcile all open items Q1 2026..." }
  GET  /reports/pl?from=2026-01-01&to=2026-03-31
  GET  /reports/balance-sheet?date=2026-03-31
  GET  /reports/cashflow?from=2026-01-01&to=2026-03-31
  POST /agents/nl  { instruction: "Generate board summary from these numbers..." }
  POST /documents/upload  { file: board_pack_q1.pdf, path: "/Board/" }

CFO Agent → Orchestrator:
  "Done. EBIT Q1: $39,600 (+23% vs plan). Pack uploaded."

Orchestrator → Human:
  "Q1 books closed. Board pack ready: [Nextcloud link]
   Headline: EBIT $39,600, 23% ahead of plan."
```

### 7.5 Spend-Approval Governance Hook

To prevent runaway autonomous spending, the CFO Agent acts as a **gatekeeper** for high-value transactions. Any Finance Agent action above the configured threshold is paused and routed to the CFO for approval before execution.

**Database table:**

```sql
CREATE TABLE spend_approval_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  threshold_usd     REAL    NOT NULL,   -- pause any booking above this amount
  approver_key_id   TEXT    NOT NULL,   -- the CFO agent's key_id
  scope             TEXT    DEFAULT '*',-- 'finance:write' or '*'
  auto_approve_usd  REAL,               -- auto-approve below this (no CFO ping needed)
  notify_human_usd  REAL                -- escalate to human above this
);

-- Example: auto-approve <$50, CFO approves $50–$2000, human approves >$2000
INSERT INTO spend_approval_rules VALUES
  (1, 50.00,   'ak_cfo_01J...', 'finance:write', 50.00,   2000.00);
```

**Approval API:**

```bash
# Arca pauses the task and calls the CFO's callback
POST https://your-cfo-agent/approve
{
  "task_id": "task_abc123",
  "action": "post_payment",
  "amount_usd": 1250.00,
  "description": "Invoice V-20034 — Supplier GmbH",
  "erp_approval_token": "apr_xyz..."
}

# CFO Agent responds
POST /api/v1/agents/tasks/task_abc123/approve
Authorization: Bearer erp_agent_sk_cfo_...
{
  "approved": true,
  "reason": "Verified against PO-2026-089. Amount matches."
}
# → Finance Agent resumes and posts the payment
```

### 7.6 What the CFO Owns vs. Delegates

| CFO Agent owns directly | Delegates to Arca agents |
|---|---|
| Spending approval decisions | All data entry and bookkeeping |
| Budget policy enforcement | Bank reconciliation |
| KPI interpretation and alerting | Invoice and offer generation |
| Board / stakeholder report narrative | VAT calculation and export |
| Escalation to human when needed | Document filing to Nextcloud |
| Token budget allocation per ERP agent | Sprint token tracking |
| Audit trail review | Dunning / payment reminders |

### 7.7 Compatibility Checklist

| Requirement | Status | Notes |
|---|---|---|
| REST API for agent calls | ✅ Full | All ERP actions available via `/api/v1/agents/*` |
| MCP Server endpoint | ✅ Optional | Enable in settings; exposes all endpoints as MCP tools |
| Scoped API keys per agent | ✅ Full | Fine-grained scope control per key |
| Token budget per agent key | ✅ Full | Daily and per-task limits configurable |
| Spend approval hooks | ✅ Full | Configurable threshold, callback URL |
| Audit trail of agent actions | ✅ Full | Immutable log in `agent_tasks` table |
| LLM-agnostic (CFO can use any model) | ✅ Full | CFO's LLM is independent of Arca's routing |
| WebSocket event stream | ✅ Full | Subscribe to any ERP state change in real time |
| Human escalation path | ✅ Full | `notify_human_usd` threshold in approval rules |

---

## 8. UI/UX — SAP Fiori Design System

### 8.1 Design Tokens (CSS Variables)

```css
:root {
  /* Brand — SAP Horizon theme */
  --sapBrandColor:       #0070F2;
  --sapHighlightColor:   #0064D9;
  --sapShellColor:       #354A5E;
  --sapActiveColor:      #0064D9;

  /* Semantic */
  --sapPositiveColor:    #188918;
  --sapCriticalColor:    #E9730C;
  --sapNegativeColor:    #BB0000;
  --sapInformativeColor: #0070F2;
  --sapNeutralColor:     #6A6D70;

  /* Background */
  --sapBackgroundColor:  #F5F6FA;
  --sapBaseColor:        #FFFFFF;
  --sapTileBackground:   #FFFFFF;

  /* Text */
  --sapTextColor:        #32363A;
  --sapLinkColor:        #0070F2;

  /* Effects */
  --sapShadow: 0 2px 8px rgba(0,0,0,0.08), 0 0 2px rgba(0,0,0,0.06);
  --sapBorderRadius: 0.5rem;
}
```

### 8.2 Shell Bar (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Arca   🔍 Search everything...   🔔 3   🤖 2 Active   👤 Jane ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Home │ Finance │ Master Data │ Inventory │ Sales │ Projects │ Reports      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 8.3 Fiori Launchpad (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Arca                                Today: March 21, 2026    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  My Launchpad                                                                ║
║                                                                              ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       ║
║  │  Finance     │ │  Invoices    │ │  Pipeline    │ │  Inventory   │       ║
║  │  💰          │ │  📄          │ │  🎯          │ │  📦          │       ║
║  │              │ │              │ │              │ │              │       ║
║  │  Balance     │ │  3 open      │ │  12 leads    │ │  2 alerts    │       ║
║  │  $24,310     │ │  $8,750 due  │ │  $42k pipe   │ │  Reorder     │       ║
║  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       ║
║                                                                              ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       ║
║  │  Projects    │ │  Agile Board │ │  Nextcloud   │ │  Agents      │       ║
║  │  📁          │ │  🔄          │ │  ☁           │ │  🤖          │       ║
║  │              │ │              │ │              │ │              │       ║
║  │  4 active    │ │  Sprint 3/8  │ │  128 docs    │ │  2 running   │       ║
║  │  2 overdue   │ │  847k tok/d  │ │  Connected ✅│ │  $1.24 today │       ║
║  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │  KPI Overview (Live)                               [Customize Widgets] │ ║
║  │                                                                        │ ║
║  │  Revenue MTD    ████████████████░░░░  $18,400 / $25,000 (73%)          │ ║
║  │  Token Budget   ████████░░░░░░░░░░░░  847k / 2,400k (35%)  $1.24/$25  │ ║
║  │  Open AR        ██████░░░░░░░░░░░░░░  $8,750 (3 invoices)             │ ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 9. Dashboard & Navigation

### 9.1 Main Dashboard (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Arca  │ Dashboard                                  🔔  🤖  👤       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  Liquidity Cockpit                                      [March 2026]  │   ║
║  │  Cash Balance      Open Receivables    Open Payables    Net Cash Flow  │   ║
║  │  $24,310           $8,750              $3,420           +$5,330        │   ║
║  │  ▲ +12% vs Feb     ⚠ 3 overdue        ✓ all on time    ▲ +8%          │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  ┌──────────────────────────┐  ┌──────────────────────────────────────┐     ║
║  │  Revenue (6 months)      │  │  Token Economy (this week)            │     ║
║  │                          │  │                                       │     ║
║  │  25k │     ╭────────╮    │  │  Anthropic  ██████████  420k  $1.26   │     ║
║  │  20k │ ╭───╯        ╰─╮  │  │  Groq       ████        180k  $0.01   │     ║
║  │  15k │─╯              ╰  │  │  Ollama     ███████     247k  $0.00   │     ║
║  │       Oct Nov Dec Jan    │  │  Total: 847k tok  |  $1.27  |  -35%   │     ║
║  └──────────────────────────┘  └──────────────────────────────────────┘     ║
║                                                                              ║
║  ┌──────────────────────────┐  ┌──────────────────────────────────────┐     ║
║  │  🤖 Agent Activity       │  │  📎 Recent Documents (Nextcloud)      │     ║
║  │  34 tasks today          │  │  📄 Invoice_RE-0042.pdf     14:32     │     ║
║  │  847k tok · $1.24        │  │  📋 Offer_AcmeCorp_v2.pdf  13:15     │     ║
║  │  Model split: 50/21/29%  │  │  📊 Sprint3_Report.pdf     11:00     │     ║
║  │  [Open Agent Monitor →]  │  │  [All Documents →]                   │     ║
║  └──────────────────────────┘  └──────────────────────────────────────┘     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 10. Master Data — Debtors & Creditors

### 10.1 Debtor Form (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ← Back  │  New Customer (Debtor)                         [Save]  [Cancel]  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Master Record                                  📎 Documents (0) [+ Upload] ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Customer No.  [C-10001]   Company/Name   [                           ]      ║
║  Group         [Standard ▼]              Language  [English ▼]               ║
║                                                                              ║
║  Address                                                                     ║
║  Street+No.  [                                          ]                    ║
║  City/State  [                    ] [      ]   Country  [USA ▼]              ║
║                                                                              ║
║  Contact              Payment Terms         Accounting                       ║
║  Name  [          ]   Net days  [30  ]      AR Account  [10001   ]           ║
║  Email [          ]   Discount  [2%  ]      Tax Code    [STD-US  ]           ║
║  Phone [          ]   Disc.days [10  ]      EIN/VAT     [        ]           ║
║                                                                              ║
║  📎 Documents (Nextcloud)                                                    ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  [+ Upload Document]  No documents yet.                              │   ║
║  │  Storage path: ☁ /ERP-Documents/Customers/C-10001_AcmeCorp/          │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 10.2 Document Attachment Rules

Documents can be attached to **every record type** in the system. Files are stored in a structured Nextcloud folder tree:

```
/ERP-Documents/
├── Customers/
│   └── C-10001_AcmeCorp/
│       ├── Contracts/
│       ├── Correspondence/
│       └── Invoices/
├── Vendors/
│   └── V-20001_SupplierLtd/
├── Projects/
│   └── PRJ-2026-003_MobileApp/
│       ├── Specs/
│       ├── Sprint-Reports/
│       └── Sign-off/
└── Finance/
    ├── Outgoing-Invoices/
    └── Incoming-Invoices/
```

---

## 11. Material Master & Inventory

### 11.1 Inventory Overview (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Arca  │ Inventory  │ Material Master                  [+ New] [Import]║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🔍 [Search articles...]          Filter: [All ▼] [Active ▼]                 ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ No.       │ Name                  │ Unit  │ Stock │ Value  │ Status  │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ ART-00001 │ MacBook Pro 14"       │ pcs   │   3   │$8,997  │  ✅    │   ║
║  │ ART-00002 │ USB-C Cable           │ pcs   │  47   │  $235  │  ✅    │   ║
║  │ ART-00003 │ Office Paper A4       │ pack  │   2   │   $28  │  ⚠️   │   ║
║  │ ART-00004 │ Developer Hours       │ hrs   │   —   │    —   │  ✅    │   ║
║  │ ART-00005 │ Consulting Package S  │ pkg   │   —   │    —   │  ✅    │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  ⚠️  2 items below reorder point  │  Total inventory value: $9,260           ║
║                                                                              ║
║  📎 Attach documents to any item → click item → Documents tab               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 12. Financial Accounting

### 12.1 Journal Entry Form (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Finance  │  New Journal Entry                       [Post] [Draft] [✕]  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Date [03/21/2026]  Doc No. [2026-0421]  Description [                   ]  ║
║                                                                              ║
║  Lines                                                          [+ Add Line] ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  # │ Debit Account     │ Credit Account    │ Amount    │ Tax │ CC   │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │  1 │ 1200 Cash/Bank    │ 4000 Revenue      │ $2,000.00 │ 0%  │ P01  │   ║
║  │    │                   │                   │ ✅ Balanced│     │      │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  📎 Attach Receipt:  [+ Upload]  →  ☁ /ERP-Documents/Finance/Receipts/      ║
║                                                                              ║
║  🤖 AI Suggest:  "Based on description, try:  Debit 6000 Office Supplies"   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 13. Sales Funnel & CRM

### 13.1 Pipeline Kanban Board (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  CRM  │  Sales Pipeline                              [+ New Lead]        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  LEAD (8)       QUALIFIED (5)   OFFER (3)      NEGOTIATION (2)  WON (6)    ║
║  $22k           $18k             $42k            $28k             $71k       ║
║  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐  ║
║  │ Acme Corp │  │ Beta Sol. │  │ Delta Ltd │  │ Echo Inc  │  │ Foxtrot │  ║
║  │ $8,000    │  │ $12,000   │  │ $24,000   │  │ $18,000   │  │ $22,000 │  ║
║  │ 📎 3 docs │  │ 📎 1 doc  │  │ 📎 5 docs │  │ 📎 8 docs │  │ ✅ Won  │  ║
║  │ ⚠ 3d left │  │ ✓ Today   │  │ ✓ Tmrw    │  │ ⚠ 1w left│  │ Closed  │  ║
║  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └─────────┘  ║
║                                                                              ║
║  🤖 Sales Agent (groq/llama3): "2 follow-ups due today — shall I draft?"    ║
║  [ Yes, draft & queue ]  [ Show Details ]  [ Dismiss ]                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 14. Project Management & Agile Development

### 14.1 Project Overview (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ☰  Projects  │  Overview                                 [+ New Project]   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ PRJ-2026-001 │ Website Relaunch   │ Fixed     │ ████████░░ 80%       │   ║
║  │              │ Acme · $12k        │ ⚠ 5 days │ 📎 12 docs           │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ PRJ-2026-003 │ Mobile App MVP     │ Agile     │ ███░░░░░░░ 34%       │   ║
║  │              │ Delta · $24k       │ Sprint 3  │ 📎 28 docs  847k tok │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 14.2 Agile Board — Scrum/Kanban (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ← Projects  │  Mobile App MVP  │  Agile Board              [Sprint 3 ▼]   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Sprint 3  ·  Mar 14–28  ·  Budget: 2,400k tok  ·  Used: 1,690k  ·  ▼ OK  ║
║                                                                              ║
║  BACKLOG     TODO (5)        IN PROGRESS (3)    REVIEW (2)     DONE (12)   ║
║  ┌────────┐  ┌────────────┐  ┌────────────┐   ┌────────────┐  ┌─────────┐  ║
║  │ US-048 │  │ US-031     │  │ US-029     │   │ US-025     │  │ US-022  │  ║
║  │ Biom.  │  │ Push Notif │  │ Login UI   │   │ Dark Mode  │  │ Onboard │  ║
║  │ 750k🔴 │  │ 180k🟡     │  │ 520k🔵     │   │ 85k🟢      │  │ 230k ✅ │  ║
║  │📎 0    │  │ 📎 2 docs  │  │ 📎 4 docs  │   │ 📎 1 doc   │  │📎 3 docs│  ║
║  └────────┘  └────────────┘  └────────────┘   └────────────┘  └─────────┘  ║
║                                                                              ║
║  ● Token estimates: 🔴 >500k  🟡 100-500k  🔵 50-100k  🟢 <50k             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 14.3 Agile Configuration

| Parameter | Options | Description |
|---|---|---|
| Methodology | Scrum, Kanban, SAFe | Board type and ceremony set |
| Sprint length | 1–4 weeks | Fixed per project |
| Estimation unit | **Tokens**, T-shirt, Fibonacci | For agent-driven projects: Tokens |
| Token budget source | Per-sprint, per-project, unlimited | Budget enforcement policy |
| WIP limits | Configurable per column | Prevent overloading |
| DoD checklist | Custom per project | Definition of Done items |
| Velocity metric | Rolling 3-sprint avg | In tokens when agent-driven |

---

## 15. Token-Based Sprint Planning

This is one of Arca's most distinctive features. Since the primary "developers" are AI agents, **story points are replaced with token estimates** — directly correlating to cost, time, and complexity.

### 15.1 Why Tokens Instead of Story Points

| Traditional SP | Token-Based |
|---|---|
| Abstract relative measure | Concrete, measurable unit |
| Requires human estimation session | AI auto-estimates based on task description |
| No direct cost correlation | Maps directly to $$ cost per model |
| Resets context each team | Tracks efficiency improvement over time |
| Hard to compare across projects | Universal across all agent tasks |

### 15.2 Token Estimation Flow (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  New User Story  │  Token Estimation                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  US-049: Implement end-to-end encrypted local storage                        ║
║                                                                              ║
║  Description: As a user I want my notes stored encrypted on device so        ║
║  that my data is protected if my phone is lost or stolen.                    ║
║                                                                              ║
║  Acceptance Criteria: 5 items                                                ║
║                                                                              ║
║  [🤖 Auto-Estimate Tokens]                                                   ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  AI Estimation (claude-sonnet-4)                                     │   ║
║  │                                                                      │   ║
║  │  Phase               Tokens    Model Rec.       Cost Est.            │   ║
║  │  ─────────────────────────────────────────────────────────────────  │   ║
║  │  Architecture design   120,000  claude-opus-4     $1.80             │   ║
║  │  Implementation        380,000  ollama/qwen2.5-c  $0.00             │   ║
║  │  Tests & validation     95,000  groq/llama3-70b   $0.007            │   ║
║  │  Documentation          45,000  ollama/llama3.1   $0.00             │   ║
║  │  ─────────────────────────────────────────────────────────────────  │   ║
║  │  TOTAL ESTIMATE        640,000 tokens              ~$1.81            │   ║
║  │                                                                      │   ║
║  │  Confidence: 72%  |  Similar past story: US-031 (actual: 180k tok)  │   ║
║  │                                                                      │   ║
║  │  [Accept Estimate]  [Adjust Manually]  [Re-estimate]                │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 15.3 Sprint Token Budget Planning

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Sprint Planning: Sprint 4  ·  Mar 29 – Apr 11, 2026                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Sprint Goal:  [Offline mode and push notifications                       ]  ║
║  Token Budget: [2,400,000] tokens   ≈ $8.50 based on routing policy         ║
║                                                                              ║
║  Stories in Sprint                              Token Budget Meter           ║
║  ┌────────────────────────────────┐             ┌───────────────────────┐   ║
║  │ US-031 Push Notif.    180k 🟡  │             │ 0      1.2M     2.4M  │   ║
║  │ US-032 Offline Mode   520k 🔵  │             │ ░░░░░░░░░░░░░░░░░░░░  │   ║
║  │ US-033 Sync Engine    480k 🔵  │             │ ████████████░░░░░░░░  │   ║
║  │ US-034 Local Cache    195k 🟡  │             │ 1,375k / 2,400k (57%) │   ║
║  │ ─────────────────────────────  │             │ Remaining: 1,025k     │   ║
║  │ Subtotal:           1,375k     │             │ ≈ 1 more medium story │   ║
║  └────────────────────────────────┘             └───────────────────────┘   ║
║                                                                              ║
║  🤖 Suggestion: "Budget allows US-050 Analytics Dashboard (240k). Add it?"  ║
║  [ Yes, add it ]   [ Show details ]   [ Keep buffer ]                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 15.4 Token Velocity Tracking

Token velocity replaces story-point velocity and enables precise cost forecasting:

```
Sprint | Budgeted  | Actual    | Cost  | Efficiency | Trend
-------|-----------|-----------|-------|------------|-------
  1    |  2,400k   |  3,120k   | $9.80 |  77%       |  —
  2    |  2,400k   |  2,890k   | $7.20 |  83%       |  ↑
  3    |  2,400k   |  1,690k   | $3.94 |  94%       |  ↑↑
  4    |  2,400k   |  (plan)   | ~$4   |  —         |
```

**Why efficiency improves over time:**
- Agents build a semantic memory of the codebase → fewer context tokens per task
- Routing policy auto-tunes toward cheaper local models as tasks become familiar
- Repeated code patterns are cached → identical sub-tasks reuse previous outputs

---

## 16. Nextcloud Document Integration

### 16.1 Configuration (Settings Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Settings  │  Nextcloud Integration                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Server URL      [https://nextcloud.yourserver.com               ]           ║
║  Username        [erp-service                                    ]           ║
║  App Password    [****************************                   ]           ║
║  Base Path       [/ERP-Documents                                 ]           ║
║  [Test Connection]          Status: ✅ Connected  (NC v28.0.4)               ║
║                                                                              ║
║  Auto-folder creation                                                        ║
║  ☑  Create customer folder on new debtor                                     ║
║  ☑  Create vendor folder on new creditor                                     ║
║  ☑  Create project folder on new project (with Specs/Reports/Sign-off)      ║
║  ☑  Auto-upload generated invoices as PDF                                   ║
║  ☑  Auto-upload receipts on journal entry posting                           ║
║  ☑  Create sprint folder on sprint creation                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 16.2 Document Widget (Appears on Every Record)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  📎 Documents  (Invoice RE-0042)                          [+ Upload]         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  📄 Invoice_RE-0042.pdf          03/21/2026   245 KB    [↗ Open] [🗑]       ║
║  📋 Delivery_Note_2026-421.pdf   03/20/2026   189 KB    [↗ Open] [🗑]       ║
║  📊 Order_Confirmation.pdf       03/18/2026   320 KB    [↗ Open] [🗑]       ║
║                                                                              ║
║  ☁ Path: /ERP-Documents/Customers/C-10001_AcmeCorp/Invoices/                ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │    📁  Drop files here or click to upload                            │   ║
║  │       PDF, DOCX, XLSX, PNG, JPG  (max 50 MB each)                   │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 17. Reports & Analytics Dashboards

### 17.1 P&L Statement (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Reports  │  P&L Statement                     [Export PDF] [Export CSV]    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Period: March 2026                           [Prev Month] [YTD] [Custom]   ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ Line Item                   │ Actual Mar  │ Prior Year  │  Budget    │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ Revenue                     │ $18,400     │ $15,200     │ $20,000    │   ║
║  │ - COGS                      │  -$2,100    │  -$1,800    │  -$2,500   │   ║
║  │ = Gross Profit              │ $16,300     │ $13,400     │ $17,500    │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ - Rent / Office             │  -$1,200    │  -$1,200    │  -$1,200   │   ║
║  │ - Software & Subscriptions  │    -$350    │    -$290    │    -$400   │   ║
║  │ - LLM API Costs (Agents)    │      -$4    │       n/a   │     -$25   │   ║
║  │ - Other G&A                 │  -$1,100    │    -$860    │  -$1,200   │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ = EBITDA                    │ $13,646     │ $11,050     │ $14,675    │   ║
║  │ - Depreciation              │    -$450    │    -$450    │    -$450   │   ║
║  │ = EBIT (Operating Income)   │ $13,196     │ $10,600     │ $14,225    │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║  📎 Save report → /ERP-Documents/Finance/PL_2026-03.pdf                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

Note: **LLM API Costs** appear as a separate expense line — giving full visibility into AI operating costs.

---

## 18. Database & Backup

### 18.1 Schema — New Tables (v2 additions)

```sql
-- LLM token usage tracking
CREATE TABLE token_usage (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id         INTEGER REFERENCES agent_tasks(id),
  sprint_id       INTEGER REFERENCES sprints(id),
  project_id      INTEGER REFERENCES projects(id),
  provider        TEXT NOT NULL,           -- 'anthropic' | 'openai' | 'groq' | 'ollama'
  model           TEXT NOT NULL,
  input_tokens    INTEGER DEFAULT 0,
  output_tokens   INTEGER DEFAULT 0,
  cost_usd        REAL DEFAULT 0,
  latency_ms      INTEGER,
  task_type       TEXT,
  recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Token budgets per sprint
CREATE TABLE sprint_token_budgets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id       INTEGER UNIQUE REFERENCES sprints(id),
  budget_tokens   INTEGER NOT NULL,
  budget_usd      REAL,
  warn_threshold  REAL DEFAULT 0.85,
  hard_limit      BOOLEAN DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent semantic memory (SQLite-VSS extension)
CREATE TABLE agent_memory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_type      TEXT NOT NULL,
  memory_key      TEXT NOT NULL,
  content         TEXT NOT NULL,
  embedding       BLOB,                    -- float32 vector
  relevance_score REAL,
  project_id      INTEGER REFERENCES projects(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed   DATETIME
);

-- LLM provider configuration
CREATE TABLE llm_providers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT UNIQUE NOT NULL,    -- 'anthropic' | 'ollama' | ...
  base_url        TEXT,
  api_key_env     TEXT,                    -- env var name, not the key itself
  default_model   TEXT,
  is_active       BOOLEAN DEFAULT 1,
  is_local        BOOLEAN DEFAULT 0,
  routing_priority INTEGER DEFAULT 10
);

-- Routing rules
CREATE TABLE llm_routing_rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  priority        INTEGER NOT NULL,
  condition_field TEXT NOT NULL,           -- 'task_type' | 'confidential' | 'token_est' | ...
  condition_op    TEXT NOT NULL,           -- '=' | '>' | '<' | 'in'
  condition_value TEXT NOT NULL,
  provider_name   TEXT NOT NULL REFERENCES llm_providers(name),
  model           TEXT,
  is_active       BOOLEAN DEFAULT 1
);

-- ─────────────────────────────────────────────────────────────────────────
-- AUDIT & LOGGING TABLES  (append-only, never updated or deleted)
-- ─────────────────────────────────────────────────────────────────────────

-- System Log: every agent action, UI event, and system event
CREATE TABLE system_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id          TEXT    UNIQUE NOT NULL,  -- UUID v4, globally unique
  occurred_at     DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  level           TEXT    NOT NULL CHECK (level IN ('DEBUG','INFO','WARN','ERROR','CRITICAL')),
  source_type     TEXT    NOT NULL,         -- 'agent' | 'human' | 'system' | 'scheduler'
  source_id       TEXT,                    -- agent key_id or user id
  source_name     TEXT,                    -- human-readable agent/user name
  module          TEXT,                    -- 'finance' | 'crm' | 'projects' | 'hr' | ...
  action          TEXT    NOT NULL,        -- e.g. 'create_invoice' | 'login' | 'route_task'
  entity_type     TEXT,                    -- 'invoice' | 'contact' | 'sprint' | ...
  entity_id       INTEGER,                 -- FK to the affected record (informational)
  summary         TEXT    NOT NULL,        -- one-line human-readable description
  detail          TEXT,                    -- JSON: full payload, parameters, result
  session_id      TEXT,                    -- groups related log entries
  request_id      TEXT,                    -- HTTP request ID for tracing
  ip_address      TEXT,                    -- originating IP (humans only)
  llm_provider    TEXT,                    -- if action was AI-generated
  llm_model       TEXT,
  tokens_used     INTEGER,
  duration_ms     INTEGER,
  status          TEXT    NOT NULL CHECK (status IN ('ok','warn','error')),
  error_code      TEXT,
  error_message   TEXT,
  -- Tamper-evidence: SHA-256 of (log_id || occurred_at || source_id || action || summary || prev_hash)
  prev_hash       TEXT,                    -- hash of previous row (chain)
  row_hash        TEXT    NOT NULL         -- hash of this row including prev_hash
);

-- Prevent ANY modification of log rows after insert
CREATE TRIGGER system_log_no_update
  BEFORE UPDATE ON system_log
BEGIN SELECT RAISE(ABORT, 'system_log is append-only — updates are not permitted'); END;

CREATE TRIGGER system_log_no_delete
  BEFORE DELETE ON system_log
BEGIN SELECT RAISE(ABORT, 'system_log is append-only — deletes are not permitted'); END;

-- Transaction Log: every financial booking (double-entry, immutable)
CREATE TABLE transaction_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_id          TEXT    UNIQUE NOT NULL,  -- UUID v4
  txn_sequence    INTEGER UNIQUE NOT NULL,  -- monotonically increasing, no gaps
  posted_at       DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  value_date      DATE    NOT NULL,         -- economic date of the transaction
  booking_period  TEXT    NOT NULL,         -- '2026-03' — used for period locking
  txn_type        TEXT    NOT NULL,         -- 'manual' | 'invoice' | 'payment' | 'storno' | ...
  document_ref    TEXT,                     -- external doc number (invoice no, receipt no)
  description     TEXT    NOT NULL,
  debit_account   TEXT    NOT NULL,         -- account number (SKR03/04 or custom)
  credit_account  TEXT    NOT NULL,
  amount_net      REAL    NOT NULL CHECK (amount_net >= 0),
  tax_rate        REAL    NOT NULL DEFAULT 0,
  tax_amount      REAL    NOT NULL DEFAULT 0,
  amount_gross    REAL    NOT NULL,         -- amount_net + tax_amount
  currency        TEXT    NOT NULL DEFAULT 'EUR',
  fx_rate         REAL    NOT NULL DEFAULT 1.0,
  amount_base_currency REAL NOT NULL,       -- always in company base currency
  cost_center     TEXT,
  project_id      INTEGER REFERENCES projects(id),
  contact_id      INTEGER REFERENCES contacts(id),
  created_by_type TEXT    NOT NULL,         -- 'agent' | 'human' | 'system'
  created_by_id   TEXT    NOT NULL,         -- agent key_id or user id
  created_by_name TEXT    NOT NULL,
  system_log_id   TEXT    REFERENCES system_log(log_id),  -- back-link to system log
  is_storno       BOOLEAN NOT NULL DEFAULT 0,
  storno_of_txn   TEXT    REFERENCES transaction_log(txn_id),  -- if this is a reversal
  period_locked   BOOLEAN NOT NULL DEFAULT 0,  -- set TRUE when accounting period is closed
  -- Hash chain for tamper-evidence
  prev_hash       TEXT,
  row_hash        TEXT    NOT NULL,
  -- Nextcloud document link
  nextcloud_path  TEXT                      -- path to attached receipt/invoice PDF
);

CREATE TRIGGER transaction_log_no_update
  BEFORE UPDATE ON transaction_log
BEGIN SELECT RAISE(ABORT, 'transaction_log is append-only — updates are not permitted'); END;

CREATE TRIGGER transaction_log_no_delete
  BEFORE DELETE ON transaction_log
BEGIN SELECT RAISE(ABORT, 'transaction_log is append-only — deletes are not permitted'); END;

-- Accounting period locks (prevent booking into closed periods)
CREATE TABLE accounting_periods (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  period          TEXT    UNIQUE NOT NULL,  -- '2026-03'
  locked_at       DATETIME,
  locked_by       TEXT,
  notes           TEXT
);
```

### 18.2 Backup Strategy

```bash
#!/bin/bash
# /scripts/backup.sh — runs nightly via backup-cron container

BACKUP_DIR="/data/backups"
DB_PATH="/data/sqlite/arca.db"
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

# Atomic SQLite backup (safe with WAL mode)
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/arca_$DATE.db"

# Compress
gzip "$BACKUP_DIR/arca_$DATE.db"

# Prune old backups
find "$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete

# Optional: sync to Nextcloud
# curl -T "$BACKUP_DIR/arca_$DATE.db.gz" \
#   "https://${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/ERP-Backups/"

echo "Backup complete: arca_$DATE.db.gz"
```

---

## 19. Agent API Reference

### 19.1 Authentication

```
Authorization: Bearer erp_agent_sk_your_key_here
X-Agent-Name: Finance-Agent-1
Content-Type: application/json
```

### 19.2 Core Endpoints

```
AUTH
  POST   /api/v1/auth/login                Human login → JWT
  POST   /api/v1/auth/agent-keys           Create agent key (admin)

CONTACTS
  GET    /api/v1/contacts                  List all contacts
  POST   /api/v1/contacts                  Create debtor or creditor
  GET    /api/v1/contacts/:id
  PUT    /api/v1/contacts/:id
  POST   /api/v1/contacts/:id/documents    Upload document to Nextcloud

FINANCE
  GET    /api/v1/invoices
  POST   /api/v1/invoices                  Create invoice + auto-book
  POST   /api/v1/payments                  Book payment
  POST   /api/v1/journal-entries           Manual journal entry
  GET    /api/v1/reports/pl                P&L for date range
  GET    /api/v1/reports/vat               VAT return data
  GET    /api/v1/reports/open-ar           Aging receivables

PROJECTS & AGILE
  GET    /api/v1/projects
  POST   /api/v1/projects
  GET    /api/v1/projects/:id/sprints
  POST   /api/v1/projects/:id/sprints      Create sprint with token budget
  GET    /api/v1/sprints/:id/burndown      Token burndown data
  POST   /api/v1/user-stories              Create user story
  PATCH  /api/v1/user-stories/:id/status
  POST   /api/v1/user-stories/:id/estimate AI token estimation

AGENTS
  POST   /api/v1/agents/tasks              Create structured task
  POST   /api/v1/agents/nl                 Natural language instruction
  GET    /api/v1/agents/tasks/:id          Poll task status
  GET    /api/v1/agents/tasks              List all tasks (filterable)

TOKEN ECONOMY
  GET    /api/v1/tokens/usage              Usage stats (by provider, date, project)
  GET    /api/v1/tokens/budget/:sprintId   Sprint budget status
  GET    /api/v1/tokens/cost-forecast      Projected cost for active sprints

DOCUMENTS
  POST   /api/v1/documents/upload          Upload to Nextcloud
  GET    /api/v1/documents/:type/:id       List documents for a record
  DELETE /api/v1/documents/:id

LLM CONFIG
  GET    /api/v1/llm/providers             List active providers
  POST   /api/v1/llm/routing-rules         Update routing rules
  POST   /api/v1/llm/test/:provider        Test provider connection
```

### 19.3 End-to-End Agent Workflow Example (Python)

```python
import time, requests

BASE    = "http://localhost/api/v1"
HEADERS = {
    "Authorization": "Bearer erp_agent_sk_...",
    "Content-Type": "application/json"
}

# 1. Send natural language instruction
resp = requests.post(f"{BASE}/agents/nl", headers=HEADERS, json={
    "instruction": """
        Create an invoice for Acme Corp (C-10001) for:
        - 8 hours consulting at $150/h
        - 1x MacBook Pro 14" (ART-00001)
        Net 30 days. Upload PDF to Nextcloud automatically.
    """,
    "llm_override": {           # optional — override routing policy
        "provider": "ollama",
        "model": "llama3.1"
    }
})
task_id = resp.json()["task_id"]

# 2. Poll until done
while True:
    s = requests.get(f"{BASE}/agents/tasks/{task_id}", headers=HEADERS).json()
    if s["status"] in ("done", "failed"):
        break
    time.sleep(2)

# 3. Result
print(s["result"])
# {
#   "invoice_id": 42,
#   "invoice_number": "INV-2026-0042",
#   "total_amount": 4999.00,
#   "nextcloud_path": "/ERP-Documents/Customers/C-10001.../INV-2026-0042.pdf",
#   "tokens_used": 28400,
#   "provider": "ollama",
#   "cost_usd": 0.00
# }
```

---

## 20. Recommended Extensions

Beyond the core features, these extensions significantly increase the value of Arca. Ranked by impact-to-effort ratio:

### 🏆 Tier 1 — High Impact, Moderate Effort

| Extension | Description | Why It Matters |
|---|---|---|
| **Email Invoice Parsing** | IMAP integration: agents read emails, detect invoices (PDF/HTML), extract fields via OCR+LLM, auto-create AP entries | Eliminates manual data entry for all incoming invoices |
| **Open Banking / Bank Sync** | Connect via FinTS (EU), Plaid (US), or Nordigen — auto-import transactions and AI-match to bookings | Daily reconciliation becomes zero-touch |
| **Automated Dunning** | 3-stage dunning workflow fully automated: reminder → formal notice → final demand, all generated by agent, uploaded to Nextcloud | Critical for solo operators who forget follow-ups |
| **Contract Lifecycle Management** | Track contracts with renewal dates, SLA obligations, auto-alert agents before expiry | Prevents missed renewals and SLA breaches |
| **Agent Memory (Persistent Context)** | Vector embedding store (SQLite-VSS) so agents "remember" past decisions, codebase patterns, customer preferences | Cuts token usage by 30–60% over time, improves consistency |

### 🥈 Tier 2 — High Impact, Lower Effort

| Extension | Description | Why It Matters |
|---|---|---|
| **Token Cost Dashboard** | Real-time breakdown: cost per project, per agent, per model, per sprint, trended over time | Essential for managing AI operating costs at scale |
| **OCR Pipeline** | Tesseract.js + LLM correction for receipts, ID cards, contracts, stamps | Digitize any paper document instantly |
| **Cashflow Forecast** | Rolling 13-week cashflow model using open AR, scheduled payments, historical patterns | Prevents liquidity surprises |
| **Webhook / Event Engine** | Emit events on any ERP state change; trigger agents from external webhooks (Stripe, Zapier, GitHub, etc.) | Enables fully automated end-to-end workflows |
| **Mobile PWA** | Progressive Web App wrapper with offline capability and push notifications | Access and approve on the go |

### 🥉 Tier 3 — Strategic Value

| Extension | Description | Why It Matters |
|---|---|---|
| **Semantic ERP Search** | Full-text + vector search across all records, documents, and bookings in one box | Find anything instantly — "invoice from Acme last quarter" |
| **Multi-Currency & FX Rates** | Real-time exchange rates, automatic conversion, currency gain/loss booking | Essential for international solopreneurs |
| **Predictive Revenue Model** | ML on historical revenue + pipeline data to forecast next 3/6/12 months | Better business planning decisions |
| **Tax Calendar Agent** | Monitors jurisdiction-specific tax deadlines; auto-generates reminders and prepares returns | Never miss a filing deadline |
| **OIDC/SSO Integration** | Login via Google, GitHub, Microsoft, or any OIDC provider | Reduce password fatigue |
| **Audit Trail Notarization** | Hash-chain of all journal entries and agent actions, exportable for audit | Tamper-evident compliance record |
| **Agent Prompt Templates** | Shareable, versioned prompt templates for common agent tasks | Community-built automation library |
| **Multi-Tenant / Workspace** | Multiple companies in one instance, isolated by tenant ID | Manage multiple business entities |

### 💡 Tier 4 — Forward-Looking

| Extension | Description |
|---|---|
| **MCP Server** | Expose Arca as an MCP server — any MCP-compatible agent can operate it natively |
| **Agent Marketplace** | Publish and subscribe to community agent workflows (e.g., "GDPR Compliance Agent") |
| **Time Intelligence** | AI-suggested work allocation based on revenue per hour, project deadlines, energy levels |
| **Predictive Inventory** | Forecast reorder points using sales velocity and lead time data |
| **Video Meeting Notes → CRM** | Transcribe meetings (Whisper), extract action items, auto-update CRM records |

---

## 21. Audit & Transaction Logs

Arca implements **two separate, immutable log files** at the database level — a System Log covering all agent and user activity, and a Transaction Log covering every financial booking. Together they provide audit-grade traceability suitable for tax audits, regulatory review, and forensic investigation of AI agent behaviour.

### 21.1 Design Principles

| Principle | Implementation |
|---|---|
| **Append-only** | SQL triggers block `UPDATE` and `DELETE` on both log tables |
| **Hash chain** | Each row hashes itself plus the previous row's hash (like a blockchain) — any tampering breaks the chain |
| **Dual attribution** | Every entry records `source_type` (agent/human/system) AND the specific `source_id` and `source_name` |
| **No gaps** | `transaction_log.txn_sequence` is a monotonic integer — auditors can detect missing rows |
| **Period locking** | Accounting periods can be locked; bookings into locked periods are rejected |
| **Nextcloud link** | Transaction log entries carry an optional `nextcloud_path` to the scanned receipt or invoice PDF |

### 21.2 System Log — Agent & User Activity

Every action that changes state in the system is written to `system_log` automatically by middleware — no agent or module needs to call it explicitly.

**What gets logged:**

```
AGENT EVENTS
  agent.task_queued         Agent task submitted to BullMQ
  agent.task_started        Agent begins executing task
  agent.task_completed      Task finished with result summary
  agent.task_failed         Task failed with error detail
  agent.llm_call            LLM API call (provider, model, tokens, cost, latency)
  agent.approval_requested  Spend approval gate triggered
  agent.approval_granted    CFO/human approved a blocked action
  agent.approval_denied     CFO/human rejected a blocked action
  agent.routing_decision    LLM router selected a provider (with reason)

HUMAN EVENTS
  auth.login                Successful login (user, IP, session)
  auth.login_failed         Failed login attempt
  auth.logout               Session ended
  user.action               Any UI form submission or button press
  user.export               Data exported (who exported what, when)

SYSTEM EVENTS
  system.startup            Container started
  system.shutdown           Graceful shutdown
  system.backup_completed   Nightly backup finished (size, duration)
  system.period_locked      Accounting period closed
  system.ollama_unreachable Ollama host returned an error
  system.nextcloud_error    Nextcloud WebDAV operation failed
```

**System Log UI (Mockup):**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Settings  │  System Log                    [Export CSV] [Verify Chain]     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Filter: Level [All ▼]  Source [All ▼]  Module [All ▼]  [21.03.2026 ▼]     ║
║                                                                              ║
║  Time        │ Lvl  │ Source          │ Action                │ Status      ║
║  ────────────┼──────┼─────────────────┼───────────────────────┼──────────   ║
║  14:32:18    │ INFO │ Finance Agent   │ create_invoice        │ ok          ║
║  14:32:17    │ INFO │ Finance Agent   │ agent.llm_call        │ ok 38k tok  ║
║  14:31:55    │ INFO │ Finance Agent   │ agent.task_started    │ ok          ║
║  14:31:54    │ INFO │ BullMQ          │ agent.task_queued     │ ok          ║
║  14:28:04    │ INFO │ jane@acme.com   │ auth.login            │ ok          ║
║  14:15:02    │ WARN │ Document Agent  │ system.nextcloud_err  │ warn retry  ║
║  13:58:11    │ INFO │ Project Agent   │ agent.task_completed  │ ok 92k tok  ║
║  13:45:30    │ INFO │ LLM Router      │ agent.routing_decision│ ok →ollama  ║
║  13:44:01    │ WARN │ CFO Agent       │ agent.approval_req    │ warn $1,250 ║
║  13:44:45    │ INFO │ CFO Agent       │ agent.approval_granted│ ok          ║
║                                                                              ║
║  ✅ Hash chain verified — 4,821 entries, no gaps, no tampering detected     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Chain verification (CLI):**

```bash
docker compose exec backend npm run audit:verify-system-log
# Output:
# Verifying system_log hash chain...
# Entries checked:  4,821
# Gaps found:       0
# Chain breaks:     0
# ✅ Chain intact — log has not been tampered with
```

### 21.3 Transaction Log — Financial Bookings

Every debit/credit booking written to the general ledger also creates an immutable entry in `transaction_log`. This is separate from the main `journal_entries` working table — the transaction log is the permanent, tamper-evident record of truth.

**Transaction Log UI (Mockup):**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Finance  │  Transaction Log (Audit)             [Export DATEV] [Verify]   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Period [2026-03 ▼]  Type [All ▼]  Account [     ]  🔍 [Search...]         ║
║                                                                              ║
║  Seq   │ Date       │ Type     │ Debit      │ Credit     │ Amount  │ By     ║
║  ──────┼────────────┼──────────┼────────────┼────────────┼─────────┼──────  ║
║  00421 │ 21.03.2026 │ invoice  │ 1200 Bank  │ 8400 Rev.  │ €2,380  │ 🤖 Fin ║
║  00420 │ 21.03.2026 │ payment  │ 1200 Bank  │ 1400 AR    │ €1,190  │ 🤖 Fin ║
║  00419 │ 20.03.2026 │ manual   │ 6560 Travel│ 1200 Bank  │   €148  │ 👤 jane ║
║  00418 │ 20.03.2026 │ invoice  │ 1200 Bank  │ 8400 Rev.  │ €5,950  │ 🤖 Fin ║
║  00417 │ 19.03.2026 │ storno   │ 8400 Rev.  │ 1200 Bank  │   €595  │ 🤖 Fin ║
║        │            │          │ ← reversal of txn 00415              │      ║
║                                                                              ║
║  Period 2026-03: 421 transactions  │  Net movement: €18,400               ║
║  🔒 Period 2026-01 locked (01.02.2026 by jane@acme.com)                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Row detail view:**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Transaction #00421 — Detail                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  TXN ID       txn_a1b2c3d4-...      Sequence   00421                        ║
║  Posted       2026-03-21 14:32:18Z  Value date 2026-03-21                   ║
║  Type         invoice               Period     2026-03  [open]               ║
║  Doc. Ref     RE-2026-0042                                                   ║
║  Description  Invoice Acme Corp — 8h Consulting + MacBook Pro 14"           ║
║  Debit        1200 Bank                                                      ║
║  Credit       8400 Revenue (19% VAT)                                        ║
║  Net           €2,000.00  Tax €380.00  Gross  €2,380.00                     ║
║  Currency     EUR  FX Rate 1.0  Base CCY €2,380.00                          ║
║  Created by   🤖 Finance Agent  (key: ak_fin_01J...)                        ║
║  System Log   → log_id: syslog_xyz...  [View entry]                        ║
║  Document     ☁ /ERP-Documents/Customers/C-10001/Invoices/RE-0042.pdf      ║
║  Row hash     3a9f2b...  Prev hash  d84c1a...  ✅ Chain OK                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 21.4 Audit Compliance Level

Arca is designed for **high-level audit compatibility** appropriate for solo operators and small teams. The following controls are implemented:

| Control | Implemented | Notes |
|---|---|---|
| Immutable transaction log | ✅ | SQL triggers prevent UPDATE/DELETE |
| Sequential numbering (no gaps) | ✅ | `txn_sequence` enforced by DB |
| Hash chain integrity | ✅ | SHA-256 chained across all rows |
| Full attribution (who/what/when) | ✅ | Human and agent actions both attributed |
| Period locking | ✅ | Closed periods reject new bookings |
| Storno-only corrections | ✅ | Errors reversed, never overwritten |
| Document attachment per booking | ✅ | Nextcloud path stored on each txn |
| DATEV export | ✅ | For tax advisor hand-off |
| Chain verification tool | ✅ | CLI command + UI button |
| Audit log export (CSV/PDF) | ✅ | Filterable by date, account, agent |
| Encryption at rest | ⚙ Optional | SQLCipher extension available |
| Off-site backup | ⚙ Optional | Sync to Nextcloud via backup cron |
| Formal GoBD compliance (DE) | ⚠ Partial | Consult your tax advisor; covers core requirements |
| SOC 2 / ISO 27001 | ❌ Out of scope | Enterprise-grade certification not targeted |

> **Note for German users (GoBD):** The append-only log, sequential numbering, hash chain, and period locking satisfy the core GoBD requirements for machine-generated accounting records. Have your tax advisor review the full setup for your specific situation.

### 21.5 Log Rotation & Retention

Log files never shrink — entries are never deleted. Long-term management is handled by exporting and archiving:

```bash
# Export system log older than 12 months to CSV, then archive to Nextcloud
docker compose exec backend npm run audit:export-system-log -- --before 2025-03-01

# Export transaction log for a closed fiscal year
docker compose exec backend npm run audit:export-transactions -- --year 2025 --format datev

# Verify hash chain at any time
docker compose exec backend npm run audit:verify -- --table transaction_log
docker compose exec backend npm run audit:verify -- --table system_log
```

---

## 22. HR Module — Small Teams

The HR module provides all essential people-management functions for a solo operator or small team (2–15 people). It integrates with the Finance module (payroll cost booking), the Project module (capacity planning), and Nextcloud (personnel file storage).

### 22.1 HR Module Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        HR Module                                  │
│                                                                   │
│  Employee       Contracts &      Leave &        Payroll           │
│  Directory  ──▶  Documents  ──▶  Absence   ──▶  Preparation      │
│     │               │               │               │            │
│     ▼               ▼               ▼               ▼            │
│  Org Chart     Nextcloud        Time Tracking   Finance Agent     │
│  (visual)      Personnel        (integration)   (cost booking)    │
│                  Files                                            │
└───────────────────────────────────────────────────────────────────┘
```

### 22.2 Employee Directory (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  HR  │  Employees                                           [+ New Employee]║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🔍 [Search employees...]          Filter: [Active ▼] [Dept. All ▼]         ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  👤 Jane Smith        │ CEO / Founder   │ Full-time │ Since 2022-01  │   ║
║  │     jane@acme.com     │ Berlin, DE      │ 📎 8 docs │ 🟢 Active      │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │  👤 Tom Müller        │ Developer       │ Part-time │ Since 2024-06  │   ║
║  │     tom@acme.com      │ Remote, DE      │ 📎 5 docs │ 🟢 Active      │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │  👤 Sara Chen         │ Designer        │ Freelance │ Since 2025-03  │   ║
║  │     sara@acme.com     │ Remote, CN      │ 📎 3 docs │ 🟡 Contract    │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 22.3 Employee Record (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ← HR  │  Tom Müller — Employee Record              [Edit]  [Offboard]      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Personal           Employment           Compensation                        ║
║  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐     ║
║  │ Employee No.   │  │ Role           │  │ Salary type   Monthly       │     ║
║  │ EMP-00002      │  │ Developer      │  │ Gross amount  €3,200 / mo  │     ║
║  │ Name           │  │ Department     │  │ Hours/week    20h (50%)    │     ║
║  │ Tom Müller     │  │ Engineering    │  │ Hourly rate   €80 / h      │     ║
║  │ DOB 1990-04-15 │  │ Reports to     │  │ Cost center   DEV-01       │     ║
║  │ Tax ID  ...    │  │ Jane Smith     │  │ Payroll acct. 6000         │     ║
║  │ IBAN    ...    │  │ Start date     │  └────────────────────────────┘     ║
║  └────────────────┘  │ 2024-06-01     │                                     ║
║                       │ Contract type  │  Skills & Certs                    ║
║                       │ Part-time DE   │  ┌────────────────────────────┐    ║
║                       └────────────────┘  │ Node.js · React · SQLite  │    ║
║                                           │ AWS Certified Dev (2025)   │    ║
║  📎 Personnel File (Nextcloud)            └────────────────────────────┘    ║
║  /ERP-Documents/HR/EMP-00002_Mueller/                                        ║
║  📄 Employment_Contract_2024.pdf                                             ║
║  📄 NDA_2024.pdf                                                             ║
║  📄 ID_Copy.pdf                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 22.4 Database Schema — HR Module

```sql
-- Employees
CREATE TABLE employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_no     TEXT    UNIQUE NOT NULL,    -- EMP-00001
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  email           TEXT    UNIQUE NOT NULL,
  phone           TEXT,
  date_of_birth   DATE,
  nationality     TEXT,
  tax_id          TEXT,
  social_sec_no   TEXT,
  iban            TEXT,                       -- stored encrypted
  address         TEXT,                       -- JSON
  emergency_contact TEXT,                     -- JSON
  department      TEXT,
  job_title       TEXT,
  reports_to      INTEGER REFERENCES employees(id),
  employment_type TEXT    NOT NULL            -- 'full_time'|'part_time'|'freelance'|'intern'
                          CHECK (employment_type IN ('full_time','part_time','freelance','intern')),
  start_date      DATE    NOT NULL,
  end_date        DATE,                       -- NULL = active
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive','offboarded')),
  cost_center     TEXT,
  payroll_account TEXT,                       -- ledger account for salary bookings
  skills          TEXT,                       -- JSON array of skill tags
  notes           TEXT,
  nextcloud_path  TEXT,                       -- /ERP-Documents/HR/EMP-00001_.../
  user_id         INTEGER REFERENCES users(id),  -- ERP login if employee has one
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employment contracts (one employee may have multiple contracts over time)
CREATE TABLE employment_contracts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL REFERENCES employees(id),
  contract_no     TEXT    UNIQUE NOT NULL,
  contract_type   TEXT    NOT NULL,           -- 'permanent'|'fixed_term'|'freelance'|'internship'
  valid_from      DATE    NOT NULL,
  valid_to        DATE,                       -- NULL = open-ended
  hours_per_week  REAL,
  salary_type     TEXT    NOT NULL            -- 'monthly'|'hourly'|'daily'|'project'
                          CHECK (salary_type IN ('monthly','hourly','daily','project')),
  salary_amount   REAL    NOT NULL,
  currency        TEXT    NOT NULL DEFAULT 'EUR',
  notice_period_days INTEGER DEFAULT 30,
  probation_end   DATE,
  nextcloud_path  TEXT,                       -- path to signed PDF
  signed_at       DATE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leave & Absence
CREATE TABLE leave_requests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL REFERENCES employees(id),
  leave_type      TEXT    NOT NULL            -- 'annual'|'sick'|'parental'|'unpaid'|'other'
                          CHECK (leave_type IN ('annual','sick','parental','unpaid','other')),
  start_date      DATE    NOT NULL,
  end_date        DATE    NOT NULL,
  days_count      REAL    NOT NULL,           -- supports half-days (0.5)
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     INTEGER REFERENCES users(id),
  approved_at     DATETIME,
  notes           TEXT,
  nextcloud_path  TEXT,                       -- sick note PDF etc.
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Annual leave balance per employee per year
CREATE TABLE leave_balances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL REFERENCES employees(id),
  year            INTEGER NOT NULL,
  leave_type      TEXT    NOT NULL,
  entitled_days   REAL    NOT NULL,
  taken_days      REAL    NOT NULL DEFAULT 0,
  carried_over    REAL    NOT NULL DEFAULT 0,
  UNIQUE (employee_id, year, leave_type)
);

-- Payroll runs (monthly summary — not a full payroll engine)
CREATE TABLE payroll_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  period          TEXT    NOT NULL,           -- '2026-03'
  employee_id     INTEGER NOT NULL REFERENCES employees(id),
  gross_salary    REAL    NOT NULL,
  employer_costs  REAL,                       -- social security, etc.
  net_salary      REAL,
  deductions      TEXT,                       -- JSON: tax, insurance, etc.
  currency        TEXT    NOT NULL DEFAULT 'EUR',
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','approved','paid','exported')),
  payment_date    DATE,
  transaction_log_id TEXT REFERENCES transaction_log(txn_id),  -- auto-booking link
  nextcloud_path  TEXT,                       -- payslip PDF
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 22.5 Leave Management (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  HR  │  Leave Management                           [+ New Request]          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TEAM CALENDAR — March 2026                                                  ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │          │ W1  │ W2  │ W3  │ W4  │  Balance        Annual  Sick     │   ║
║  │ Jane     │     │ ███ │     │     │  Jane:    18/30   ██░    0/0    │   ║
║  │ Tom      │     │     │ ██  │     │  Tom:     12/15   ████░  2/∞   │   ║
║  │ Sara     │ █   │     │     │     │  Sara:     8/10   ████░  0/0   │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  PENDING REQUESTS                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ Tom Müller │ Annual leave │ 07.04–11.04 │ 5 days │ [Approve] [Deny] │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 22.6 Payroll Preparation (Mockup)

The payroll module is a **preparation assistant**, not a licensed payroll engine. It calculates gross costs, generates payslip drafts, and books the payroll expense automatically — but does not submit to tax authorities. For official payroll processing, export to DATEV or your payroll provider.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  HR  │  Payroll  │  March 2026                     [Export DATEV] [Approve] ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ Employee  │ Type      │ Gross    │ Employer+  │ Net est. │ Status    │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ Jane S.   │ Full-time │ €5,000   │ +€1,100    │ ~€3,150  │ Draft ✎  │   ║
║  │ Tom M.    │ Part-time │ €3,200   │   +€704    │ ~€2,100  │ Draft ✎  │   ║
║  │ Sara C.   │ Freelance │ €2,400   │     €0     │  €2,400  │ Draft ✎  │   ║
║  ├──────────────────────────────────────────────────────────────────────┤   ║
║  │ TOTAL     │           │ €10,600  │ +€1,804    │          │           │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  On approval:                                                                ║
║  • Finance Agent books payroll expense → account 6000 (Salaries)            ║
║  • Payslip PDFs generated and uploaded to /ERP-Documents/HR/Payslips/       ║
║  • Entry logged in transaction_log (immutable)                               ║
║  • DATEV export file created for your tax advisor                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 22.7 Org Chart (Mockup)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  HR  │  Org Chart                                        [Export PNG]       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║                    ┌───────────────┐                                         ║
║                    │  Jane Smith   │                                         ║
║                    │  CEO/Founder  │                                         ║
║                    └───────┬───────┘                                         ║
║                            │                                                 ║
║              ┌─────────────┴─────────────┐                                  ║
║              │                           │                                   ║
║     ┌────────┴───────┐         ┌─────────┴──────┐                           ║
║     │   Tom Müller   │         │   Sara Chen    │                            ║
║     │   Developer    │         │   Designer     │                            ║
║     │  Part-time     │         │   Freelance    │                            ║
║     └────────────────┘         └────────────────┘                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 22.8 HR API Endpoints

```
HR
  GET    /api/v1/hr/employees                 List all employees
  POST   /api/v1/hr/employees                 Create employee record
  GET    /api/v1/hr/employees/:id             Employee detail
  PUT    /api/v1/hr/employees/:id             Update employee
  POST   /api/v1/hr/employees/:id/offboard    Start offboarding workflow

  GET    /api/v1/hr/contracts/:employeeId     List contracts for employee
  POST   /api/v1/hr/contracts                 Create contract
  POST   /api/v1/hr/contracts/:id/documents   Upload signed contract to Nextcloud

  GET    /api/v1/hr/leave                     All leave requests (filterable)
  POST   /api/v1/hr/leave                     Submit leave request
  PATCH  /api/v1/hr/leave/:id/approve         Approve / reject request
  GET    /api/v1/hr/leave/balances            Leave balances per employee

  GET    /api/v1/hr/payroll/:period           Payroll run for a period
  POST   /api/v1/hr/payroll/:period/approve   Approve run → triggers Finance Agent
  GET    /api/v1/hr/payroll/:period/export    DATEV export

  GET    /api/v1/hr/org-chart                 Org chart data (JSON)
```

### 22.9 Finance Integration — Payroll Cost Booking

When a payroll run is approved, the Finance Agent automatically creates the corresponding journal entries, which are logged in `transaction_log`:

```
Debit  6000 Salaries & Wages         €10,600.00
Credit 1200 Bank / Payroll Account  -€10,600.00

Debit  6010 Employer Social Security  €1,804.00
Credit 1740 Payroll Liabilities      -€1,804.00
```

Both entries are written to `transaction_log` with:
- `created_by_type = 'agent'`
- `created_by_name = 'Finance Agent'`
- `system_log_id` linking back to the agent task entry in `system_log`
- `nextcloud_path` pointing to the payslip bundle PDF


---

## 23. Glossary

| Term | Definition |
|---|---|
| **Agentic ERP** | An ERP system that can be fully operated by AI agents autonomously, not just assisted |
| **Agent Key** | Long-lived API key for AI agents — replaces password authentication |
| **LLM Router** | Component that selects the optimal LLM provider per task based on routing rules |
| **Token Budget** | Maximum number of LLM tokens allocated to a sprint or task |
| **Token Velocity** | Tokens consumed per sprint — the agent-first analog of story point velocity |
| **Token Efficiency** | Ratio of work delivered per token consumed; improves as agents build memory |
| **Ollama** | Open-source tool to run LLMs locally on CPU/GPU — zero API cost |
| **LM Studio** | GUI desktop app for running local GGUF models with an OpenAI-compatible API |
| **Groq** | Cloud inference provider offering very high token/second throughput |
| **WAL Mode** | Write-Ahead Logging in SQLite — enables concurrent reads during writes |
| **WebDAV** | HTTP-based protocol for file operations — used by Nextcloud integration |
| **SQLite-VSS** | SQLite extension for vector similarity search — powers agent semantic memory |
| **BullMQ** | Redis-backed job queue for agent task scheduling and retrying |
| **Sprint** | Time-boxed iteration (1–4 weeks) for agile development |
| **Story Points** | Traditional relative effort estimate — replaced by Tokens in agent-driven projects |
| **Burndown Chart** | Visualization of remaining work (tokens) over a sprint's timeline |
| **Velocity** | Average tokens consumed per sprint over rolling 3-sprint window |
| **DoD** | Definition of Done — checklist a user story must satisfy before marking complete |
| **DATEV** | German standard for accounting data exchange with tax advisors |
| **FinTS / HBCI** | German online banking protocol for automated bank statement import |
| **OIDC** | OpenID Connect — standard for federated/SSO authentication |
| **MCP** | Model Context Protocol — standard for exposing tools/data to AI agents |
| **OCR** | Optical Character Recognition — text extraction from images/PDFs |
| **System Log** | Immutable, append-only record of every agent action, human login, and system event |
| **Transaction Log** | Immutable, sequentially numbered record of every financial booking |
| **Hash Chain** | Each log row contains the SHA-256 hash of itself plus the previous row, enabling tamper detection |
| **Storno** | Reversal entry that cancels a booking; errors are always corrected by storno, never by deletion |
| **Period Locking** | Closing an accounting period so no further bookings can be made to it |
| **GoBD** | German principles for digital bookkeeping — defines immutability and traceability requirements |
| **Payroll Run** | Monthly calculation of gross salary, employer costs, and net pay per employee |
| **Leave Balance** | Entitlement vs. taken days per employee per year and leave type |
| **Employment Contract** | Formal agreement stored as PDF in Nextcloud, linked to the employee record |
| **HR Module** | People-management component covering employees, contracts, leave, and payroll preparation |
| **DATEV** | German standard for accounting and payroll data exchange with tax advisors |
| **Offboarding** | Structured process for ending an employee relationship (contract end, file archival, access revocation) |

---

*Arca · Open Source · MIT License · v1.0 · March 2026*
*Built with Claude Code · Diagrams by Excalidraw · Containers by Docker · Ollama external · Audit-grade logs · HR module*

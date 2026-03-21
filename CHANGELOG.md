# Changelog

All notable changes to Arca are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-03-21

### Added

**Core ERP**
- Double-entry financial accounting with SKR03/SKR04 chart of accounts
- Debtor & creditor master records with full address and payment terms
- Invoice creation, payment booking, VAT calculation
- DATEV export for tax advisor handoff
- Material master, inventory management, stock movements, reorder alerts
- Accounting period locking — closed periods reject new bookings

**Agile Project Management**
- Classic project management (fixed price, time & material)
- Scrum / Kanban agile board with full sprint lifecycle
- Token-based story point estimation (replaces abstract SP with measurable token budgets)
- Token burndown chart and velocity tracking
- Sprint cost dashboard with per-provider breakdown

**CRM & Sales**
- 5-stage sales pipeline with Kanban drag-and-drop
- Lead qualification, offer creation, deal conversion
- Activity log per contact (calls, emails, meetings, tasks)

**HR Module**
- Employee directory with full personal, employment, and compensation records
- Employment contracts with Nextcloud PDF storage
- Leave requests, approval workflow, leave balance tracking
- Payroll preparation with auto-booking via Finance Agent
- Org chart visualisation

**Audit & Compliance**
- Immutable `system_log` — every agent action, login, and system event
- Immutable `transaction_log` — every financial booking with sequential numbering
- SHA-256 hash chain on both tables — tamper detection at database level
- SQL `BEFORE UPDATE` / `BEFORE DELETE` triggers enforce append-only
- Chain verification CLI: `npm run audit:verify`

**Multi-LLM Router**
- Anthropic, OpenAI, Groq, Ollama (external), LM Studio, any OpenAI-compatible endpoint
- Rule-based routing: task type, data sensitivity, token estimate, latency requirement
- Automatic cost threshold fallback to local models
- Token usage and cost tracking per provider, sprint, and project

**Agent Infrastructure**
- Finance, Sales, Project, and Document agents
- BullMQ + Redis task queue with retry and dead-letter handling
- Natural language task endpoint: `POST /agents/nl`
- Agent API keys with fine-grained scopes and daily token budgets

**Multi-Agent Orchestration**
- Full REST API for external orchestrators (OpenClaw, CrewAI, AutoGen, LangGraph)
- Optional MCP server endpoint
- CFO sub-agent pattern with spend-approval governance hook
- Configurable `spend_approval_rules` table with human escalation threshold

**Nextcloud Integration**
- Document upload widget on every record type
- Auto-structured folder tree: `/ERP-Documents/Customers/`, `/HR/`, `/Finance/`
- Auto-upload of generated invoices and payslips
- WebDAV service with retry logic

**Docker**
- Single `docker compose up` deployment
- Services: nginx, backend, frontend, redis, backup-cron
- Ollama runs externally on host (full GPU access, shared models)
- Nightly SQLite backup with configurable retention

**UI**
- SAP Fiori 3 Horizon design system (SAP UI5 Web Components)
- Role-based Fiori Launchpad with live KPI tiles
- Agent Activity Monitor with real-time token/cost display

---

## Unreleased

See [Roadmap in README](README.md#roadmap) for planned features.

# Contributing to Arca

Thank you for your interest in contributing. Arca is built in the open and welcomes contributions of all kinds — bug reports, documentation improvements, new features, and community agent workflows.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Convention](#branch--commit-convention)
- [Pull Request Process](#pull-request-process)
- [Adding a New LLM Provider](#adding-a-new-llm-provider)
- [Adding an Agent Action](#adding-an-agent-action)
- [Database Migrations](#database-migrations)

---

## Code of Conduct

Be respectful. Constructive criticism is welcome; personal attacks are not. We follow the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Ways to Contribute

| Type | How |
|---|---|
| 🐛 Bug report | Open an issue using the bug report template |
| 💡 Feature request | Open an issue using the feature request template |
| 📖 Documentation | Edit files in `docs/` and submit a PR |
| 🔌 New LLM provider | See [Adding a New LLM Provider](#adding-a-new-llm-provider) |
| 🤖 Agent workflow | Submit to `community-agents/` with a README |
| 🌍 Translation | Add a new language folder under `docs/i18n/` |
| 🧪 Tests | Add tests under `backend/src/__tests__/` |

---

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/arca.git
cd arca

# 2. Install backend dependencies
cd backend && npm install

# 3. Configure environment
cp .env.example .env
# Set at minimum: JWT_SECRET, one LLM API key or OLLAMA_BASE_URL

# 4. Run migrations on a local dev DB
DATABASE_PATH=./dev.db npm run db:migrate

# 5. Start backend in dev mode (hot reload)
npm run dev

# 6. In a separate terminal, start frontend
cd ../frontend && npm install && npm run dev

# 7. Open http://localhost:5173
```

### Running with Docker (recommended for full stack)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## Branch & Commit Convention

**Branches:**
```
main          — stable releases only
dev           — integration branch, PRs target this
feat/...      — new features
fix/...       — bug fixes
docs/...      — documentation only
chore/...     — build, deps, config
```

**Commits (Conventional Commits):**
```
feat: add Stripe webhook for invoice auto-payment
fix: transaction_log hash chain broken on storno entries
docs: add MCP server setup guide
chore: upgrade Node.js base image to 20.12
refactor: extract LLM routing logic to separate module
test: add unit tests for token budget enforcement
```

---

## Pull Request Process

1. Target the `dev` branch — never `main` directly
2. Ensure `npm test` passes with no regressions
3. Update `docs/documentation.md` if your change affects user-facing behaviour
4. Add an entry to `CHANGELOG.md` under `## Unreleased`
5. Fill in the pull request template fully
6. Request review from at least one maintainer

PRs that touch `transaction_log`, `system_log`, or the hash chain implementation require two approvals.

---

## Adding a New LLM Provider

1. Create `backend/src/agents/providers/your-provider.js`:

```javascript
// Must export a complete() function matching the adapter interface
module.exports = {
  async complete(prompt, options = {}) {
    // options: { model, max_tokens, system, temperature }
    // Must return: { content: string, usage: { input_tokens, output_tokens } }
  }
};
```

2. Register it in `backend/src/agents/providers/llm-adapter.js`:

```javascript
const PROVIDERS = {
  // ... existing
  your_provider: require('./your-provider'),
};
```

3. Add pricing to the `PRICING` map in `llm-adapter.js`
4. Add an entry to the `llm_providers` seed data in `db/seeds/`
5. Document it in `docs/documentation.md` Section 5.1

---

## Adding an Agent Action

1. Add your action to the relevant agent module under `backend/src/agents/`:

```javascript
// backend/src/agents/finance.agent.js
async function yourNewAction(params, context) {
  // 1. Validate params
  // 2. Call ERP modules (db operations)
  // 3. Write to system_log via context.log()
  // 4. Return structured result
}

module.exports.actions = {
  // ... existing
  your_new_action: yourNewAction,
};
```

2. Add it to the API router in `backend/src/api/agents.routes.js`
3. Document it in `docs/documentation.md` Section 6.2

---

## Database Migrations

All schema changes must be done via numbered migration files — **never** edit the schema directly:

```bash
# Create a new migration
npm run db:migration:create -- --name add_hr_performance_reviews

# This creates: backend/src/db/migrations/NNNN_add_hr_performance_reviews.js
# Fill in the up() and down() functions, then:

npm run db:migrate       # apply
npm run db:migrate:undo  # rollback
```

Migrations that modify `system_log`, `transaction_log`, or add new triggers require a detailed comment explaining the audit impact.

---

## Questions?

Open a Discussion on GitHub or reach out via the issue tracker. We read everything.

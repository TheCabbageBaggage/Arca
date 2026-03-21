#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Arca — GitHub Repository Setup & Push Script
#
#  Usage:
#    chmod +x setup-github.sh
#    ./setup-github.sh
#
#  Prerequisites:
#    - git installed
#    - GitHub CLI (gh) installed — https://cli.github.com
#      OR a GitHub repo already created (set REPO_URL below)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

# ── Config — edit these ────────────────────────────────────────────
REPO_NAME="arca"
REPO_DESC="Agent-First ERP for the Modern Solo Operator"
REPO_VISIBILITY="public"   # public | private
DEFAULT_BRANCH="main"
# ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${BLUE}[arca]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }

echo ""
echo "  ⬡  Arca — GitHub Repository Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Init git ───────────────────────────────────────────────
if [ ! -d ".git" ]; then
  info "Initialising git repository..."
  git init -b "$DEFAULT_BRANCH"
  success "Git initialised"
else
  warn ".git already exists — skipping git init"
fi

# ── Step 2: Configure git identity if needed ───────────────────────
if [ -z "$(git config user.email 2>/dev/null)" ]; then
  read -rp "  Git email: " GIT_EMAIL
  read -rp "  Git name:  " GIT_NAME
  git config user.email "$GIT_EMAIL"
  git config user.name  "$GIT_NAME"
fi

# ── Step 3: Verify .env is not tracked ────────────────────────────
if [ -f ".env" ]; then
  if git check-ignore -q .env; then
    success ".env is gitignored — safe"
  else
    warn ".env exists but is NOT in .gitignore — aborting to protect secrets"
    exit 1
  fi
fi

# ── Step 4: Initial commit ─────────────────────────────────────────
info "Staging all files..."
git add .

if git diff --cached --quiet; then
  warn "Nothing to commit — repository may already be initialised"
else
  git commit -m "feat: initial Arca v1.0 scaffold

  - Docker Compose stack (nginx, backend, frontend, redis, backup-cron)
  - Backend: Express + Socket.io + BullMQ + SQLite WAL
  - Multi-LLM router: Anthropic, OpenAI, Groq, Ollama, LM Studio
  - Full schema: finance, CRM, projects, HR, inventory, audit logs
  - Immutable hash-chained system_log + transaction_log
  - SAP Fiori frontend scaffold (React 18 + UI5 Web Components)
  - GitHub Actions CI pipeline
  - Full documentation (docs/documentation.md)

  Implementation stubs ready for coding — see CONTRIBUTING.md"

  success "Initial commit created"
fi

# ── Step 5: Create GitHub repo ─────────────────────────────────────
echo ""
info "Creating GitHub repository..."

if command -v gh &>/dev/null; then
  # GitHub CLI available
  gh auth status &>/dev/null || gh auth login

  gh repo create "$REPO_NAME" \
    --description "$REPO_DESC" \
    --"$REPO_VISIBILITY" \
    --source=. \
    --remote=origin \
    --push

  REPO_URL=$(gh repo view "$REPO_NAME" --json url -q .url)
  success "Repository created and pushed: $REPO_URL"

else
  # No GitHub CLI — manual fallback
  warn "GitHub CLI (gh) not found. Manual steps:"
  echo ""
  echo "  1. Create a new repo at: https://github.com/new"
  echo "     Name: $REPO_NAME"
  echo "     Description: $REPO_DESC"
  echo "     Visibility: $REPO_VISIBILITY"
  echo "     ⚠️  Do NOT initialise with README, .gitignore, or license"
  echo ""
  echo "  2. Then run:"
  echo ""
  echo "     git remote add origin https://github.com/YOUR_USERNAME/$REPO_NAME.git"
  echo "     git push -u origin $DEFAULT_BRANCH"
  echo ""
  echo "  Install GitHub CLI to skip these steps: https://cli.github.com"
fi

# ── Step 6: Set up dev branch ──────────────────────────────────────
if command -v gh &>/dev/null; then
  info "Creating dev branch..."
  git checkout -b dev
  git push -u origin dev
  git checkout "$DEFAULT_BRANCH"
  success "dev branch created"

  info "Setting dev as default PR target..."
  gh repo edit --default-branch "$DEFAULT_BRANCH" 2>/dev/null || true
fi

# ── Step 7: Next steps ─────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}  Arca is on GitHub! Next steps:${NC}"
echo ""
echo "  1. cp .env.example .env"
echo "     → Fill in your API keys and secrets"
echo ""
echo "  2. Install Ollama on your host (free local LLM):"
echo "     https://ollama.com/download"
echo "     ollama pull llama3.1"
echo ""
echo "  3. Start the stack:"
echo "     docker compose up --build -d"
echo "     docker compose exec backend npm run db:migrate"
echo "     docker compose exec backend npm run create-admin"
echo "     open http://localhost"
echo ""
echo "  4. Implement stubs:"
echo "     See CONTRIBUTING.md — each stub has a full spec comment."
echo "     CI runs automatically on push to main/dev."
echo ""
echo "  Docs: docs/documentation.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

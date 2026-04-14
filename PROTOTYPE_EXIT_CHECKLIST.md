# Prototype Exit Checklist (`v1` Demo-Ready)

Use this checklist as a binary go/no-go gate before declaring the prototype demo-ready.

- [ ] **Bootstrap verification**: Fresh-start bootstrap path from `README.md` runs successfully (env, compose up, migrate).
- [ ] **Smoke test pass**: `bash scripts/smoke-test.sh http://localhost:3000` returns all checks passing.
- [ ] **Core UI walkthrough**: Login + contacts + finance + projects + documents flows each complete successfully in the frontend.
- [ ] **Audit verification**: `cd backend && npm run audit:verify -- --table transaction_log` and `npm run audit:verify-system-log` both pass.
- [ ] **Backup path working**: `backup.sh` (or documented backup command) completes and produces a recoverable artifact.
- [ ] **Docs aligned with code**: `README.md`, `V1_SCOPE_FREEZE.md`, and `PROJECT_PLAN.md` reflect actual shipped behavior.

**Exit rule:** Mark `v1` demo-ready only when every item above is **Yes**.

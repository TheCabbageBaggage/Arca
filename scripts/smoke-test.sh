#!/bin/bash
set -e
BASE_URL="${1:-http://localhost:3000}"
echo "Arca Smoke Test"
echo "==============="
echo "Testing: $BASE_URL"
echo ""

# 1. Health
curl -s "$BASE_URL/api/health" | grep -q '"status":"ok"' && echo "  ✓ Health OK" || { echo "  ✗ Health failed"; exit 1; }

# 2. Login
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"identifier":"admin@arca.local","password":"admin1234"}')
echo "$LOGIN_RESP" | grep -q '"token"' && echo "  ✓ Login OK" || { echo "  ✗ Login failed"; exit 1; }
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "  Token: ${TOKEN:0:20}..."

# 3. Contacts
curl -s "$BASE_URL/api/v1/contacts" -H "Authorization: Bearer $TOKEN" | grep -q '"contacts"' && echo "  ✓ Contacts OK" || { echo "  ✗ Contacts failed"; exit 1; }

# 4. Projects
curl -s "$BASE_URL/api/v1/projects" -H "Authorization: Bearer $TOKEN" | grep -q '"projects"' && echo "  ✓ Projects OK" || { echo "  ✗ Projects failed"; exit 1; }

# 5. Finance lists + reports
curl -s "$BASE_URL/api/v1/invoices" -H "Authorization: Bearer $TOKEN" | grep -q '"invoices"' && echo "  ✓ Invoices list OK" || { echo "  ✗ Invoices list failed"; exit 1; }
curl -s "$BASE_URL/api/v1/payments" -H "Authorization: Bearer $TOKEN" | grep -q '"payments"' && echo "  ✓ Payments list OK" || { echo "  ✗ Payments list failed"; exit 1; }
curl -s "$BASE_URL/api/v1/journal-entries" -H "Authorization: Bearer $TOKEN" | grep -q '"journal_entries"' && echo "  ✓ Journal entries list OK" || { echo "  ✗ Journal entries list failed"; exit 1; }
curl -s "$BASE_URL/api/v1/reports/pl" -H "Authorization: Bearer $TOKEN" | grep -q '"report"' && echo "  ✓ P&L report OK" || { echo "  ✗ P&L report failed"; exit 1; }

# 6. Tasks endpoint (approval queue visibility path)
curl -s "$BASE_URL/api/v1/agents/tasks?status=waiting_approval" -H "Authorization: Bearer $TOKEN" | grep -q '"tasks"' && echo "  ✓ Waiting-approval task list OK" || { echo "  ✗ Waiting-approval task list failed"; exit 1; }

echo ""
echo "Note: For deterministic spend-approval demo setup run:"
echo "  sqlite3 data/sqlite/arca.db < scripts/seed-spend-approval.sql"
echo ""
echo "========================================="
echo "✓ All smoke tests passed!"

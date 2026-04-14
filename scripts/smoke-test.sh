#!/bin/bash
set -e
BASE_URL="${1:-http://localhost:3000}"
UNIQUE_ID=$(date +%s)
echo "Arca Smoke Test"
echo "==============="
echo "Testing against: $BASE_URL"
echo ""
echo "1. Health endpoint..."
curl -s "$BASE_URL/api/health" | grep -q '"status":"ok"' && echo "  ✓ Health OK" || { echo "  ✗ Health failed"; exit 1; }
echo "2. Admin login..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"identifier":"admin@arca.local","password":"admin1234"}')
echo "$LOGIN_RESP" | grep -q '"token"' && echo "  ✓ Login OK" || { echo "  ✗ Login failed"; exit 1; }
TOKEN=$(echo "$LOGIN_RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "  Token: ${TOKEN:0:20}..."
echo "3. List contacts..."
curl -s "$BASE_URL/api/v1/contacts" -H "Authorization: Bearer $TOKEN" | grep -q '"contacts"' && echo "  ✓ Contacts list OK" || { echo "  ✗ Contacts list failed"; exit 1; }
echo "4. Create contact (unique ID: $UNIQUE_ID)..."
CREATE_RESP=$(curl -s -X POST "$BASE_URL/api/v1/contacts" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"contact_no\":\"SMOKE-$UNIQUE_ID\",\"type\":\"debtor\",\"name\":\"Smoke Test Contact\",\"email\":\"smoke@example.com\"}")
echo "$CREATE_RESP" | grep -q '"contact"' && echo "  ✓ Create contact OK" || { echo "  ✗ Create contact failed"; exit 1; }
echo "5. List projects..."
curl -s "$BASE_URL/api/v1/projects" -H "Authorization: Bearer $TOKEN" | grep -q '"projects"' && echo "  ✓ Projects list OK" || { echo "  ✗ Projects list failed"; exit 1; }
echo "6. List invoices..."
curl -s "$BASE_URL/api/v1/invoices" -H "Authorization: Bearer $TOKEN" | grep -q '"invoices"' && echo "  ✓ Invoices list OK" || { echo "  ✗ Invoices list failed"; exit 1; }
echo ""
echo "========================================="
echo "✓ All smoke tests passed successfully!"

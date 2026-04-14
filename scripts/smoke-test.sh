#!/bin/bash
# Arca Smoke Test
# Non-interactive smoke test for Arca prototype
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL: http://localhost

set -e

BASE_URL="${1:-http://localhost}"
echo "Arca Smoke Test"
echo "==============="
echo "Testing against: $BASE_URL"
echo ""

# Function to make HTTP requests and check response
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local expected_status="${4:-200}"
  local description="$5"
  local extra_headers="$6"
  
  echo "Testing: $description"
  echo "  Endpoint: $method $endpoint"
  
  local curl_cmd="curl -s -w \"\\n%{http_code}\" -X \"$method\" \"${BASE_URL}${endpoint}\" "
  
  if [ -n "$extra_headers" ]; then
    curl_cmd="$curl_cmd $extra_headers "
  fi
  
  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d \"$data\" "
  fi
  
  curl_cmd="$curl_cmd 2>/dev/null"
  
  local response
  response=$(eval "$curl_cmd")
  
  local body=$(echo "$response" | head -n -1)
  local status_code=$(echo "$response" | tail -n 1)
  
  if [ "$status_code" -eq "$expected_status" ]; then
    echo "  ✓ Status: $status_code (expected $expected_status)"
    # Try to extract and show a success message if available
    local message=$(echo "$body" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$message" ]; then
      echo "  Message: $message"
    fi
  else
    echo "  ✗ Status: $status_code (expected $expected_status)"
    echo "  Response body:"
    echo "$body" | head -20
    exit 1
  fi
  echo ""
}

# 1. Health endpoint
make_request "GET" "/api/v1/health" "" "200" "Health endpoint"

# 2. Login with bootstrap admin
LOGIN_DATA='{"username":"admin","password":"admin1234"}'
make_request "POST" "/api/v1/auth/login" "$LOGIN_DATA" "200" "Admin login"

# Extract token from login response
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Failed to extract JWT token from login response"
  exit 1
fi

echo "Obtained JWT token (truncated): ${TOKEN:0:20}..."
echo ""

# 3. Get current user (protected endpoint)
make_request "GET" "/api/v1/auth/me" "" "200" "Get current user (authenticated)" "-H \"Authorization: Bearer $TOKEN\""

# 4. List contacts (create/list flow)
make_request "GET" "/api/v1/contacts" "" "200" "List contacts" "-H \"Authorization: Bearer $TOKEN\""

# 5. List projects
make_request "GET" "/api/v1/projects" "" "200" "List projects" "-H \"Authorization: Bearer $TOKEN\""

# 6. Audit verification (system log)
make_request "GET" "/api/v1/audit/system-log?limit=5" "" "200" "Audit system log" "-H \"Authorization: Bearer $TOKEN\""

echo "========================================="
echo "✓ All smoke tests passed successfully!"
echo ""
echo "Tested endpoints:"
echo "  - Health check"
echo "  - Admin login"
echo "  - Authenticated user info"
echo "  - Contacts list"
echo "  - Projects list"
echo "  - Audit system log"
echo ""
echo "Arca prototype is running correctly."

#!/bin/bash
# Shared auth helper. Source this file to get COOKIE_JAR set.
# Usage: source scripts/seed/_auth.sh

API_URL="${API_URL:-http://localhost:3000}"
COOKIE_JAR=$(mktemp)

response=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@metrolinea.com","password":"admin123"}')

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" != "200" ]; then
  echo "  ✗ Login failed ($http_code). Run seed-admin.sh first."
  exit 1
fi

echo "  ✓ Logged in as admin@metrolinea.com"

# Helper: POST a resource, print result, skip on 409
api_post() {
  local endpoint="$1"
  local data="$2"
  local label="$3"

  resp=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d "$data")

  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  case "$code" in
    200|201)
      id=$(echo "$body" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
      echo "  ✓ $label (id: $id)"
      echo "$body"
      ;;
    409) echo "  ~ $label (already exists)" ;;
    *)   echo "  ✗ $label failed ($code): $body" ;;
  esac
}

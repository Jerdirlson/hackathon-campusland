#!/bin/bash
# Creates the default admin user. Safe to run multiple times (409 = already exists).

API_URL="${API_URL:-http://localhost:3000}"

echo "→ Admin user"

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin Metrolinea","email":"admin@metrolinea.com","password":"admin123","role":"admin"}')

http_code=$(echo "$response" | tail -n1)

case "$http_code" in
  201) echo "  ✓ admin@metrolinea.com created" ;;
  409) echo "  ~ admin@metrolinea.com already exists" ;;
  *)   echo "  ✗ failed ($http_code): $(echo "$response" | sed '$d')" ; exit 1 ;;
esac

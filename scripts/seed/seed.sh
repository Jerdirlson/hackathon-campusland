#!/bin/bash
# Master seed script. Runs all seed steps in order.
# Usage:
#   sh scripts/seed/seed.sh
#   API_URL=http://localhost:3000 sh scripts/seed/seed.sh

set -e
export API_URL="${API_URL:-http://localhost:3000}"
DIR="$(dirname "$0")"

echo "======================================"
echo "  Metrolinea — Database Seed"
echo "  API: $API_URL"
echo "======================================"
echo ""

# 1. Health check
echo "→ Checking API..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$STATUS" != "200" ]; then
  echo "  ✗ API not reachable at $API_URL (status: $STATUS)"
  echo "    Run: make up"
  exit 1
fi
echo "  ✓ API is up"
echo ""

# 2. Admin user
sh "$DIR/seed-admin.sh"
echo ""

# 3. Stations
sh "$DIR/seed-stations.sh"

# 4. Buses
sh "$DIR/seed-buses.sh"

# 5. Routes + stops + templates
sh "$DIR/seed-routes.sh"

echo ""
echo "======================================"
echo "  Seed complete."
echo "======================================"

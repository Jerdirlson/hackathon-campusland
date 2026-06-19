#!/bin/bash
# Adds schedule templates for P2 and P6, then generates today's daily trips.
# Requires seed-stations-p2.sql, seed-route-p2.sql, seed-stations-p6.sql,
# seed-route-p6.sql to have run first.

set -e
export API_URL="${API_URL:-http://localhost:3000}"
source "$(dirname "$0")/_auth.sh"

TODAY=$(date +%Y-%m-%d)
DOW=$(date +%u)

# ── Fetch route IDs ──────────────────────────────────────────────────────────
get_route_id() {
  local code="$1"
  curl -s -b "$COOKIE_JAR" "$API_URL/routes" | \
    grep -o "\"id\":[0-9]*[^}]*\"code\":\"$code\"" | \
    grep -o '"id":[0-9]*' | cut -d: -f2 | head -1
}

P2_ID=$(get_route_id "P2")
P6_ID=$(get_route_id "P6")

echo ""
echo "→ Route IDs — P2: $P2_ID  |  P6: $P6_ID"

# ── Schedule templates ───────────────────────────────────────────────────────
echo ""
echo "→ Schedule templates"

api_post "/schedule-templates" \
  "{\"route_id\":$P2_ID,\"departure_time\":\"05:30:00\",\"frequency_minutes\":12,\"days_of_week\":[1,2,3,4,5],\"valid_from\":\"$TODAY\"}" \
  "P2 Weekday (every 12 min from 05:30)"

api_post "/schedule-templates" \
  "{\"route_id\":$P2_ID,\"departure_time\":\"06:30:00\",\"frequency_minutes\":20,\"days_of_week\":[6,7],\"valid_from\":\"$TODAY\"}" \
  "P2 Weekend (every 20 min from 06:30)"

api_post "/schedule-templates" \
  "{\"route_id\":$P6_ID,\"departure_time\":\"05:45:00\",\"frequency_minutes\":15,\"days_of_week\":[1,2,3,4,5],\"valid_from\":\"$TODAY\"}" \
  "P6 Weekday (every 15 min from 05:45)"

api_post "/schedule-templates" \
  "{\"route_id\":$P6_ID,\"departure_time\":\"07:00:00\",\"frequency_minutes\":25,\"days_of_week\":[6,7],\"valid_from\":\"$TODAY\"}" \
  "P6 Weekend (every 25 min from 07:00)"

# ── Generate today's daily trips ─────────────────────────────────────────────
echo ""
echo "→ Generating daily trips for $TODAY"

for ROUTE_CODE in P1 P2 P6; do
  RID=$(get_route_id "$ROUTE_CODE")
  if [ -z "$RID" ]; then
    echo "  ✗ Route $ROUTE_CODE not found"
    continue
  fi

  RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$API_URL/daily-trips/generate" \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$TODAY\",\"route_id\":$RID}")

  CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  GENERATED=$(echo "$BODY" | grep -o '"generated":[0-9]*' | cut -d: -f2)
  SKIPPED=$(echo "$BODY" | grep -o '"skipped":\[[^]]*\]' | grep -o ',' | wc -l)

  echo "  $ROUTE_CODE (id:$RID) → $GENERATED trips generated  ($CODE)"
done

echo ""
echo "Done."

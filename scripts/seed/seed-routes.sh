#!/bin/bash
# Creates route P1 and links its stations in order.
# Depends on stations existing (run seed-stations.sh first).
# Usage: sh scripts/seed/seed-routes.sh

set -e
API_URL="${API_URL:-http://localhost:3000}"
source "$(dirname "$0")/_auth.sh"

echo ""
echo "→ Routes"

# --- Route P1 ---------------------------------------------------------------
ROUTE=$(curl -s -b "$COOKIE_JAR" \
  -X POST "$API_URL/routes" \
  -H "Content-Type: application/json" \
  -d '{"code":"P1","name":"Terminal Norte – Terminal Sur","description":"Ruta troncal norte-sur de Bucaramanga"}')

ROUTE_CODE=$(echo "$ROUTE" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$API_URL/routes" \
  -H "Content-Type: application/json" \
  -d '{"code":"P1","name":"Terminal Norte – Terminal Sur"}' 2>/dev/null || echo "done")

ROUTE_ID=$(echo "$ROUTE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$ROUTE_ID" ]; then
  # Route already exists — fetch its id
  ROUTE_ID=$(curl -s -b "$COOKIE_JAR" "$API_URL/routes" | grep -o '"id":[0-9]*,"code":"P1"' | grep -o '[0-9]*' | head -1)
  echo "  ~ Route P1 (already exists, id: $ROUTE_ID)"
else
  echo "  ✓ Route P1 (id: $ROUTE_ID)"
fi

# --- Fetch station IDs by code ----------------------------------------------
get_station_id() {
  local code="$1"
  curl -s -b "$COOKIE_JAR" "$API_URL/stations" | \
    grep -o "\"id\":[0-9]*[^}]*\"code\":\"$code\"" | \
    grep -o '"id":[0-9]*' | cut -d: -f2 | head -1
}

echo ""
echo "→ Linking stations to P1"

TN=$(get_station_id "EST-TN")
CAN=$(get_station_id "EST-CAÑ")
CAB=$(get_station_id "EST-CAB")
PRA=$(get_station_id "EST-PRA")
SOT=$(get_station_id "EST-SOT")
SAN=$(get_station_id "EST-SAN")
PRO=$(get_station_id "EST-PRO")
TS=$(get_station_id "EST-TS")

api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$TN,\"stop_order\":1,\"estimated_minutes_from_prev\":0}"   "Stop 1 — Terminal Norte"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$CAN,\"stop_order\":2,\"estimated_minutes_from_prev\":8}"  "Stop 2 — Cañaveral"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$CAB,\"stop_order\":3,\"estimated_minutes_from_prev\":6}"  "Stop 3 — Cabecera del Llano"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$PRA,\"stop_order\":4,\"estimated_minutes_from_prev\":5}"  "Stop 4 — El Prado"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$SOT,\"stop_order\":5,\"estimated_minutes_from_prev\":5}"  "Stop 5 — Sotomayor"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$SAN,\"stop_order\":6,\"estimated_minutes_from_prev\":7}"  "Stop 6 — Parque Santander"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$PRO,\"stop_order\":7,\"estimated_minutes_from_prev\":4}"  "Stop 7 — Provenza"
api_post "/routes/$ROUTE_ID/stations" "{\"station_id\":$TS,\"stop_order\":8,\"estimated_minutes_from_prev\":6}"   "Stop 8 — Terminal Sur"

# --- Schedule template -------------------------------------------------------
echo ""
echo "→ Schedule template for P1"

TODAY=$(date +%Y-%m-%d)
DOW=$(date +%u)  # 1=Mon … 7=Sun

api_post "/schedule-templates" \
  "{\"route_id\":$ROUTE_ID,\"departure_time\":\"06:00:00\",\"frequency_minutes\":15,\"days_of_week\":[1,2,3,4,5],\"valid_from\":\"$TODAY\"}" \
  "Weekday template (every 15 min from 06:00)"

api_post "/schedule-templates" \
  "{\"route_id\":$ROUTE_ID,\"departure_time\":\"07:00:00\",\"frequency_minutes\":20,\"days_of_week\":[6,7],\"valid_from\":\"$TODAY\"}" \
  "Weekend template (every 20 min from 07:00)"

echo ""
echo "Routes done."

#!/usr/bin/env bash
# Smoke test del servicio Metrolinea AI
# Uso: bash scripts/smoke_test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"

echo "==> 1. Health"
curl -s "$BASE_URL/health" | python3 -m json.tool

NOW="$(date -u +%Y-%m-%dT%H:%M:%S)"
SCHED="$(date -u -v-12M +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d '-12 min' +%Y-%m-%dT%H:%M:%S)"
ARRIVED="$(date -u +%Y-%m-%dT%H:%M:%S)"

echo
echo "==> 2. Ingestar paso de bus por parada (con retraso de 12 min)"
curl -s -X POST "$BASE_URL/ingest/stop-time" \
  -H "Content-Type: application/json" \
  -d "{\"route_id\":\"R1\",\"stop_id\":\"S001\",\"bus_id\":\"B-101\",\"scheduled_at\":\"$SCHED\",\"arrived_at\":\"$ARRIVED\"}" \
  | python3 -m json.tool

echo
echo "==> 3. Ingestar ocupación alta (38/40)"
curl -s -X POST "$BASE_URL/ingest/occupancy" \
  -H "Content-Type: application/json" \
  -d "{\"bus_id\":\"B-101\",\"route_id\":\"R1\",\"timestamp\":\"$NOW\",\"people_count\":38,\"capacity\":40}" \
  | python3 -m json.tool

echo
echo "==> 4. Pedir decisión para la ruta R1"
curl -s "$BASE_URL/decision/R1" | python3 -m json.tool

echo
echo "==> 5. Listar rutas con datos"
curl -s "$BASE_URL/routes" | python3 -m json.tool

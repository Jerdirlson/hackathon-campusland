#!/bin/bash
# Seeds buses for Metrolinea.
# Usage: sh scripts/seed/seed-buses.sh

set -e
API_URL="${API_URL:-http://localhost:3000}"
source "$(dirname "$0")/_auth.sh"

echo ""
echo "→ Buses"

api_post "/buses" '{"code":"B001","license_plate":"MLN-001","capacity":40}' "Bus B001"
api_post "/buses" '{"code":"B002","license_plate":"MLN-002","capacity":40}' "Bus B002"
api_post "/buses" '{"code":"B003","license_plate":"MLN-003","capacity":40}' "Bus B003"
api_post "/buses" '{"code":"B004","license_plate":"MLN-004","capacity":40}' "Bus B004"
api_post "/buses" '{"code":"B005","license_plate":"MLN-005","capacity":40}' "Bus B005"
api_post "/buses" '{"code":"B006","license_plate":"MLN-006","capacity":40}' "Bus B006"
api_post "/buses" '{"code":"B007","license_plate":"MLN-007","capacity":40}' "Bus B007"
api_post "/buses" '{"code":"B008","license_plate":"MLN-008","capacity":40}' "Bus B008"
api_post "/buses" '{"code":"B009","license_plate":"MLN-009","capacity":35}' "Bus B009"
api_post "/buses" '{"code":"B010","license_plate":"MLN-010","capacity":35}' "Bus B010"
api_post "/buses" '{"code":"B011","license_plate":"MLN-011","capacity":35}' "Bus B011"
api_post "/buses" '{"code":"B012","license_plate":"MLN-012","capacity":35}' "Bus B012"
api_post "/buses" '{"code":"B013","license_plate":"MLN-013","capacity":40}' "Bus B013"
api_post "/buses" '{"code":"B014","license_plate":"MLN-014","capacity":40}' "Bus B014"
api_post "/buses" '{"code":"B015","license_plate":"MLN-015","capacity":40}' "Bus B015"

echo ""
echo "Buses done."

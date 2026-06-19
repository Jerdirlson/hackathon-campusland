#!/bin/bash
# Seeds stations for Metrolinea Bucaramanga.
# Usage: sh scripts/seed/seed-stations.sh

set -e
API_URL="${API_URL:-http://localhost:3000}"
source "$(dirname "$0")/_auth.sh"

echo ""
echo "→ Stations"

api_post "/stations" '{"code":"EST-TN","name":"Terminal Norte","address":"Av. Quebrada Seca","lat":7.1450,"lng":-73.1250}' "Terminal Norte"
api_post "/stations" '{"code":"EST-CAÑ","name":"Cañaveral","address":"Cra 33 con Calle 45","lat":7.1380,"lng":-73.1190}' "Cañaveral"
api_post "/stations" '{"code":"EST-CAB","name":"Cabecera del Llano","address":"Calle 48 con Cra 27","lat":7.1290,"lng":-73.1130}' "Cabecera del Llano"
api_post "/stations" '{"code":"EST-PRA","name":"El Prado","address":"Cra 27 con Calle 52","lat":7.1200,"lng":-73.1100}' "El Prado"
api_post "/stations" '{"code":"EST-SOT","name":"Sotomayor","address":"Calle 56 con Cra 24","lat":7.1150,"lng":-73.1070}' "Sotomayor"
api_post "/stations" '{"code":"EST-SAN","name":"Parque Santander","address":"Cra 19 con Calle 36","lat":7.1100,"lng":-73.1020}' "Parque Santander"
api_post "/stations" '{"code":"EST-PRO","name":"Provenza","address":"Calle 30 con Cra 22","lat":7.1050,"lng":-73.1000}' "Provenza"
api_post "/stations" '{"code":"EST-TS","name":"Terminal Sur","address":"Cra 15 con Calle 20","lat":7.0980,"lng":-73.0970}' "Terminal Sur"

echo ""
echo "Stations done."

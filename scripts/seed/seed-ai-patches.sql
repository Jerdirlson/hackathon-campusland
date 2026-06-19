-- AI Triggers and Patches seed
-- Covers all 4 trigger types: high_demand, bus_full, low_occupancy, pre_day_evaluation
-- Covers all reviewable statuses: pending, approved, modified, rejected
-- Safe to run multiple times (truncates and reinserts ai_triggers / ai_patches only)
--
-- Routes referenced:  L-01 (id 1), P2 (id 4), P6 (id 5)
-- Buses referenced:   BUS-001 (id 1), BUS-002 (id 2), BUS-003 (id 3)

-- ─── Clean up previous seed data ────────────────────────────────────────────
-- Only removes rows created by this seeder (identified by the sentinel comment
-- in the payload). To wipe everything use TRUNCATE ai_patches, ai_triggers CASCADE.
DELETE FROM ai_patches  WHERE trigger_id IN (SELECT id FROM ai_triggers WHERE payload ? '_seed');
DELETE FROM ai_triggers WHERE payload ? '_seed';

-- ─── Triggers ────────────────────────────────────────────────────────────────
INSERT INTO ai_triggers (trigger_type, route_id, daily_trip_id, payload, status) VALUES

  -- T1: high_demand en P2 (horario pico mañana)
  ('high_demand',        4, NULL, '{"_seed":true,"occupancy_ratio":0.94,"passenger_count":47,"source":"vision_counter"}',   'resolved'),

  -- T2: bus_full en P6 (bus al límite)
  ('bus_full',           5, NULL, '{"_seed":true,"occupancy_ratio":1.0, "passenger_count":50,"capacity":50}',                'resolved'),

  -- T3: low_occupancy en L-01 (viaje vacío)
  ('low_occupancy',      1, NULL, '{"_seed":true,"occupancy_ratio":0.12,"passenger_count":5,"capacity":45}',                 'resolved'),

  -- T4: pre_day_evaluation global
  ('pre_day_evaluation', NULL, NULL, '{"_seed":true,"date":"2026-06-20","routes_evaluated":["L-01","P2","P6"]}',             'resolved'),

  -- T5: high_demand en L-01 (tarde)
  ('high_demand',        1, NULL, '{"_seed":true,"occupancy_ratio":0.91,"passenger_count":41,"source":"vision_counter"}',   'resolved'),

  -- T6: low_occupancy en P6
  ('low_occupancy',      5, NULL, '{"_seed":true,"occupancy_ratio":0.08,"passenger_count":4,"capacity":50}',                'resolved');

-- ─── Patches ─────────────────────────────────────────────────────────────────
-- Uses a CTE to resolve the inserted trigger IDs by their payload fingerprint
WITH t AS (
  SELECT id, payload->>'occupancy_ratio' AS occ,
         trigger_type,
         route_id,
         payload->>'source' AS src,
         payload->>'date'   AS ev_date
  FROM ai_triggers
  WHERE payload ? '_seed'
  ORDER BY id
)
INSERT INTO ai_patches (trigger_id, analysis, proposed_actions, status)

-- Patch 1 (pending) — high_demand P2, pico mañana
SELECT
  (SELECT id FROM t WHERE trigger_type = 'high_demand' AND route_id = 4 LIMIT 1),
  'Análisis de alta demanda — Ruta P2 (Villabel – Plataforma P3), viernes 07:15–08:30 hrs.
El sensor de visión registró 47 pasajeros en el bus BUS-002 (capacidad 50), alcanzando un índice
de ocupación del 94%. En el mismo horario del viernes anterior la ocupación fue del 88%.
Se proyectan 3 paradas críticas adicionales (Antonia Santos, Puerta del Sol, Kr 21 Cl 54)
donde subirán pasajeros sin poder abordar. Se recomienda despachar un bus de refuerzo
inmediato y notificar a los usuarios del próximo viaje.',
  '[
    {"type":"add_trip","route_id":4,"bus_id":3,"date":"2026-06-20","departure":"07:30"},
    {"type":"notify_users","daily_trip_id":null,"message":"Bus adicional disponible en ruta P2 a las 07:30 desde Casetas Villabel. Por favor abordar en orden."}
  ]'::jsonb,
  'pending'

UNION ALL

-- Patch 2 (pending) — bus_full P6
SELECT
  (SELECT id FROM t WHERE trigger_type = 'bus_full' AND route_id = 5 LIMIT 1),
  'Bus al 100% de capacidad — Ruta P6 (Canaveral – Plataforma P3), 07:48 hrs.
BUS-003 (50/50 pasajeros) se encuentra lleno desde la estación Canaveral Vagon Sur.
Quedan 12 paradas por recorrer. Se estima que aproximadamente 15–20 pasajeros en
paradas intermedias no podrán abordar. El siguiente viaje programado sale en 18 minutos.
Se recomienda notificar a los pasajeros en paradas intermedias para que aguarden
el siguiente bus y, de no existir un viaje próximo disponible, agregar un viaje extraordinario.',
  '[
    {"type":"notify_users","daily_trip_id":null,"message":"El bus de ruta P6 está lleno. El siguiente saldrá en aproximadamente 18 min desde Canaveral Vagon Sur."},
    {"type":"add_trip","route_id":5,"bus_id":1,"date":"2026-06-20","departure":"08:06"}
  ]'::jsonb,
  'pending'

UNION ALL

-- Patch 3 (approved) — low_occupancy L-01
SELECT
  (SELECT id FROM t WHERE trigger_type = 'low_occupancy' AND route_id = 1 LIMIT 1),
  'Baja ocupación detectada — Ruta L-01 (Centro – Norte), viaje de las 09:45 hrs.
BUS-001 lleva 5 pasajeros (ocupación 12%) con 8 paradas restantes. Históricamente
este horario no supera el 20% los días de semana. El viaje siguiente de la misma ruta
sale a las 10:10 y tiene capacidad disponible (23 pasajeros confirmados sobre 45).
Cancelar este viaje ahorra combustible y tiempo de conductor; los 5 pasajeros activos
pueden ser reasignados al viaje de las 10:10 sin impacto significativo en su tiempo
de llegada (diferencia estimada: +12 min).',
  '[
    {"type":"cancel_trip","daily_trip_id":null,"reason":"Ocupación del 12% — por debajo del umbral de viabilidad operativa (20%)"},
    {"type":"assign_users","daily_trip_id":null,"trip_plan_ids":[]}
  ]'::jsonb,
  'approved'

UNION ALL

-- Patch 4 (modified) — pre_day_evaluation global
SELECT
  (SELECT id FROM t WHERE trigger_type = 'pre_day_evaluation' LIMIT 1),
  'Evaluación pre-operacional — Viernes 20 de junio de 2026.
Resumen por ruta:
• L-01 (Centro – Norte): 38 planes de viaje activos. Capacidad programada 90 pasajeros (2 viajes).
  Demanda cubre el 42% — suficiente, pero se recomienda redistribuir pasajeros equitativamente.
• P2 (Villabel – Plataforma P3): 112 planes activos. Capacidad total 130 (3 viajes x 40–50 pax).
  Demanda proyectada en horario pico (07:00–09:00): 95 pax. Margen ajustado.
• P6 (Canaveral – Plataforma P3): 78 planes activos. Capacidad 150 (3 viajes). Sin problemas.
Recomendación general: agregar 1 viaje en P2 en la ventana 07:15–07:45 para absorber pico
y reasignar pasajeros de L-01 en los viajes existentes.',
  '[
    {"type":"add_trip","route_id":4,"bus_id":2,"date":"2026-06-20","departure":"07:20"},
    {"type":"assign_users","daily_trip_id":null,"trip_plan_ids":[]},
    {"type":"notify_users","daily_trip_id":null,"message":"Operación del viernes 20/06 confirmada. Revise su asignación de viaje en la app antes de las 06:30."}
  ]'::jsonb,
  'modified'

UNION ALL

-- Patch 5 (rejected) — high_demand L-01 tarde
SELECT
  (SELECT id FROM t WHERE trigger_type = 'high_demand' AND route_id = 1 LIMIT 1),
  'Posible alta demanda — Ruta L-01 (Centro – Norte), viaje de las 17:30 hrs.
El sensor reportó 41 pasajeros (ocupación 91%) en BUS-005. Sin embargo, revisando
el contexto: es viernes por la tarde y la ocupación histórica de este horario supera
el 85% de forma regular — no es un evento anómalo. El siguiente viaje sale en 8 minutos
con capacidad disponible. No se justifica despachar un bus extra en este momento.
Se sugiere monitorear durante los próximos 20 minutos antes de tomar acción adicional.',
  '[
    {"type":"notify_users","daily_trip_id":null,"message":"Alta demanda en ruta L-01 sentido Norte. Próximo bus en 8 minutos."}
  ]'::jsonb,
  'rejected'

UNION ALL

-- Patch 6 (pending) — low_occupancy P6
SELECT
  (SELECT id FROM t WHERE trigger_type = 'low_occupancy' AND route_id = 5 LIMIT 1),
  'Baja ocupación crítica — Ruta P6 (Canaveral – Plataforma P3), viaje de las 14:20 hrs.
BUS-002 registra solo 4 pasajeros (8%) a 6 paradas del inicio de la ruta.
Contexto: horario valle entre pico mediodía (13:00) y pico tarde (17:00).
El viaje siguiente parte a las 14:55. Retrasar este viaje 15 minutos podría absorber
pasajeros de las siguientes 2 paradas sin afectar la frecuencia general de la ruta.
Alternativa: cancelar y reasignar los 4 pasajeros al viaje de las 14:55.',
  '[
    {"type":"delay_trip","daily_trip_id":null,"new_departure":"2026-06-20T14:35:00","reason":"Baja ocupación — espera de 15 min para acumular pasajeros en paradas intermedias"},
    {"type":"notify_users","daily_trip_id":null,"message":"El viaje de ruta P6 de las 14:20 se retrasa 15 minutos. Nueva salida: 14:35 desde Canaveral Vagon Sur."}
  ]'::jsonb,
  'pending';

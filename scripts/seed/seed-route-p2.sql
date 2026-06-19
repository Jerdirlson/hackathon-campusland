-- Route P2: Villabel – Plataforma P3
-- Depends on seed-stations-p2.sql having run first.

-- 1. Insert route (idempotent)
INSERT INTO routes (code, name, description, status)
VALUES (
  'P2',
  'Villabel – Plataforma P3',
  'Ruta Floridablanca – Centro Bucaramanga',
  'active'
)
ON CONFLICT (code) DO NOTHING;

-- 2. Link all 24 stations in order
WITH route AS (
  SELECT id FROM routes WHERE code = 'P2'
)
INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
SELECT
  r.id,
  s.id,
  v.stop_order,
  v.minutes
FROM route r
CROSS JOIN (VALUES
  ('P2-S01',  1,  0),
  ('P2-S02',  2,  2),
  ('P2-S03',  3,  3),
  ('P2-S04',  4,  3),
  ('P2-S05',  5,  2),
  ('P2-S06',  6,  2),
  ('P2-S07',  7,  2),
  ('P2-S08',  8,  3),
  ('P2-S09',  9,  4),
  ('P2-S10', 10,  5),
  ('P2-S11', 11,  6),
  ('P2-S12', 12,  8),
  ('P2-S13', 13,  6),
  ('P2-S14', 14,  4),
  ('P2-S15', 15,  4),
  ('P2-S16', 16,  5),
  ('P2-S17', 17,  3),
  ('P2-S18', 18,  3),
  ('P2-S19', 19,  3),
  ('P2-S20', 20,  4),
  ('P2-S21', 21,  4),
  ('P2-S22', 22,  3),
  ('P2-S23', 23,  3),
  ('P2-S24', 24,  2)
) AS v(code, stop_order, minutes)
JOIN stations s ON s.code = v.code
ON CONFLICT (route_id, stop_order) DO NOTHING;

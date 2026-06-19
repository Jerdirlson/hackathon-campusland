-- Route P6: Canaveral Vagon Sur – Plataforma P3
-- Depends on seed-stations-p2.sql and seed-stations-p6.sql having run first.

INSERT INTO routes (code, name, description, status)
VALUES (
  'P6',
  'Canaveral – Plataforma P3',
  'Ruta Floridablanca – Sotomayor Bucaramanga',
  'active'
)
ON CONFLICT (code) DO NOTHING;

WITH route AS (
  SELECT id FROM routes WHERE code = 'P6'
)
INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
SELECT
  r.id,
  s.id,
  v.stop_order,
  v.minutes
FROM route r
CROSS JOIN (VALUES
  ('P6-S01',  1,  0),   -- Canaveral Vagon Sur
  ('P2-S09',  2,  7),   -- Hormigueros (shared with P2)
  ('P2-S10',  3,  5),   -- Estacion Payador (shared with P2)
  ('P2-S11',  4,  5),   -- Estacion Transferencia Provenza (shared with P2)
  ('P6-S05',  5,  6),   -- Estacion Diamante
  ('P2-S12',  6,  5),   -- Antonia Santos (shared with P2)
  ('P6-S07',  7,  5),   -- Conucos
  ('P6-S08',  8,  3),   -- Kr 27 Cl 55
  ('P6-S09',  9,  5),   -- Parque Turbay
  ('P6-S10', 10,  5),   -- Kr 27 Cl 37
  ('P6-S11', 11,  4),   -- Decoriente
  ('P6-S12', 12,  5),   -- Kr 27 Cl 19
  ('P6-S13', 13,  4),   -- Sena
  ('P6-S14', 14,  3),   -- Kr 27 Cl 11
  ('P2-S24', 15,  2)    -- Plataforma P3 (shared with P2)
) AS v(code, stop_order, minutes)
JOIN stations s ON s.code = v.code
ON CONFLICT (route_id, stop_order) DO NOTHING;

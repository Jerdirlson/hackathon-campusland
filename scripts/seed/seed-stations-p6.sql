-- New stations for route P6 (not already created by seed-stations-p2.sql)
-- Hormigueros (P2-S09), Estacion Payador (P2-S10), Antonia Santos (P2-S12) already exist.

INSERT INTO stations (code, name, address, lat, lng) VALUES
  ('P6-S01', 'Canaveral Vagon Sur',                   'Floridablanca',              7.0704887, -73.1046640),
  ('P6-S05', 'Estacion Diamante',                      'Sotomayor, Bucaramanga',    7.0952935, -73.1104768),
  ('P6-S07', 'Conucos',                                'Sotomayor, Bucaramanga',    7.1064739, -73.1130140),
  ('P6-S08', 'Kr 27 Cl 55',                           'Sotomayor, Bucaramanga',    7.1097733, -73.1143020),
  ('P6-S09', 'Parque Turbay',                          'Sotomayor, Bucaramanga',    7.1152358, -73.1149900),
  ('P6-S10', 'Kr 27 Cl 37',                           'Mejoras Públicas, Bucaramanga', 7.1201780, -73.1160300),
  ('P6-S11', 'Decoriente',                             'Mejoras Públicas, Bucaramanga', 7.1243007, -73.1176810),
  ('P6-S12', 'Kr 27 Cl 19',                           'Bucaramanga',                   7.1301113, -73.1195460),
  ('P6-S13', 'Sena',                                  'Bucaramanga',                   7.1341555, -73.1201730),
  ('P6-S14', 'Kr 27 Cl 11',                           'Bucaramanga',                   7.1368291, -73.1202160)
ON CONFLICT (code) DO NOTHING;

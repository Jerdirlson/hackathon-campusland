-- Stations for route P2 (Floridablanca)
-- Source: Google Maps route data

INSERT INTO stations (code, name, address, lat, lng) VALUES
  ('P2-S01', 'Casetas Villabel',              'Sotomayor, Floridablanca',          7.0831700, -73.1012100),
  ('P2-S02', 'Estacion de Bombeo Amb',        'Kr 11 Cl 5, Floridablanca',         7.0818348, -73.1005330),
  ('P2-S03', 'Casetas Villabel La Parada',    'Cl 11 Kr 11, Floridablanca',        7.0798030, -73.1010670),
  ('P2-S04', 'Plaza Villabel',                'Kr 12 Cl 12, Floridablanca',        7.0786960, -73.1030770),
  ('P2-S05', 'Kr 12 Cl 16',                  'Kr 12 Cl 16, Floridablanca',        7.0773090, -73.1035930),
  ('P2-S06', 'Kr 12 Cl 19',                  'Kr 12 Cl 19, Floridablanca',        7.0759999, -73.1039950),
  ('P2-S07', 'Kr 12 Cl 23',                  'Kr 12 Cl 23, Floridablanca',        7.0743651, -73.1045990),
  ('P2-S08', 'Kr 12 Cl 27',                  'Kr 12 Cl 27, Floridablanca',        7.0733030, -73.1053140),
  ('P2-S09', 'Hormigueros',                   'Hormigueros, Floridablanca',         7.0787940, -73.1080470),
  ('P2-S10', 'Estacion Payador',              'Sotomayor, Floridablanca',          7.0844780, -73.1078060),
  ('P2-S11', 'Estacion Transferencia Provenza','Sotomayor, Bucaramanga',           7.0909670, -73.1091330),
  ('P2-S12', 'Antonia Santos',                'Sotomayor, Bucaramanga',            7.1007780, -73.1115400),
  ('P2-S13', 'Puerta del Sol',                'Bucaramanga',                       7.1070930, -73.1149000),
  ('P2-S14', 'Kr 21 Cl 54',                  'Kr 21 Cl 54, Bucaramanga',          7.1099260, -73.1168470),
  ('P2-S15', 'Parque la Concordia',           'Bucaramanga',                       7.1134400, -73.1186900),
  ('P2-S16', 'Kr 21 Cl 37',                  'Bolívar, Bucaramanga',              7.1182360, -73.1209930),
  ('P2-S17', 'Kr 21 Cl 34 Club del Comercio','Centro, Bucaramanga',               7.1205500, -73.1218630),
  ('P2-S18', 'Parque Antonia Santos',         'Antonia Santos, Bucaramanga',       7.1223800, -73.1226000),
  ('P2-S19', 'Kr 21 Cl 28',                  'Comuna 4 Occidental, Bucaramanga',  7.1249900, -73.1235500),
  ('P2-S20', 'Kr 21 Cl 20',                  'Comuna 4 Occidental, Bucaramanga',  7.1284000, -73.1244200),
  ('P2-S21', 'Kr 21 Cl 15',                  'Bucaramanga',                       7.1324080, -73.1252530),
  ('P2-S22', 'Kr 21 Cl 12 Uimist',           'Bucaramanga',                       7.1348210, -73.1257110),
  ('P2-S23', 'Cl 11 Kr 23',                  'Bucaramanga',                       7.1364398, -73.1237490),
  ('P2-S24', 'Plataforma P3',                'Bucaramanga',                       7.1372361, -73.1220680)
ON CONFLICT (code) DO NOTHING;

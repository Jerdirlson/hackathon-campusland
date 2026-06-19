-- Guarda metadata por mensaje del asistente (ej. la sugerencia de ruta),
-- para que la tarjeta de ruta persista al recargar el historial.
ALTER TABLE assistant_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE daily_trips
  ADD COLUMN current_occupancy INT NOT NULL DEFAULT 0,
  ADD COLUMN occupancy_updated_at TIMESTAMP;

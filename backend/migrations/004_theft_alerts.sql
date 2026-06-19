-- theft incidents reported by passengers
CREATE TABLE theft_alerts (
  id            SERIAL PRIMARY KEY,
  daily_trip_id INT NOT NULL REFERENCES daily_trips(id),
  station_id    INT REFERENCES stations(id),
  reported_by   INT NOT NULL REFERENCES users(id),
  description   TEXT,
  severity      VARCHAR(20) NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('low', 'medium', 'high')),
  status        VARCHAR(20) NOT NULL DEFAULT 'reported'
                  CHECK (status IN ('reported', 'under_review', 'confirmed', 'resolved', 'dismissed')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theft_alerts_daily_trip_id ON theft_alerts(daily_trip_id);
CREATE INDEX idx_theft_alerts_status        ON theft_alerts(status);
CREATE INDEX idx_theft_alerts_reported_by   ON theft_alerts(reported_by);

-- full audit trail: every status change with who did it and why
CREATE TABLE theft_alert_events (
  id              SERIAL PRIMARY KEY,
  alert_id        INT NOT NULL REFERENCES theft_alerts(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status      VARCHAR(20) NOT NULL,
  changed_by      INT NOT NULL REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theft_alert_events_alert_id ON theft_alert_events(alert_id);

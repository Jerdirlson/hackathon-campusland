CREATE TABLE scheduled_jobs (
  id             SERIAL PRIMARY KEY,
  job_type       VARCHAR(50) NOT NULL
                   CHECK (job_type IN ('pre_day_evaluation', 'low_occupancy_check')),
  daily_trip_id  INT REFERENCES daily_trips(id) ON DELETE CASCADE,
  scheduled_at   TIMESTAMP NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  result         JSONB,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_pending   ON scheduled_jobs(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_scheduled_jobs_trip      ON scheduled_jobs(daily_trip_id);

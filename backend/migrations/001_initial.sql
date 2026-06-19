-- stations
CREATE TABLE stations (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(200),
  lat         NUMERIC(10, 7),
  lng         NUMERIC(10, 7),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- routes
CREATE TABLE routes (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ordered stops per route
CREATE TABLE route_stations (
  id                           SERIAL PRIMARY KEY,
  route_id                     INT NOT NULL REFERENCES routes(id)   ON DELETE CASCADE,
  station_id                   INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  stop_order                   INT NOT NULL,
  estimated_minutes_from_prev  INT,
  UNIQUE (route_id, stop_order),
  UNIQUE (route_id, station_id)
);

-- buses
CREATE TABLE buses (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) NOT NULL UNIQUE,
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  capacity      INT         NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- master schedule templates
CREATE TABLE schedule_templates (
  id                SERIAL PRIMARY KEY,
  route_id          INT    NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  departure_time    TIME   NOT NULL,
  frequency_minutes INT    NOT NULL,
  days_of_week      INT[]  NOT NULL,
  valid_from        DATE   NOT NULL,
  valid_until       DATE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- daily trips generated from templates
CREATE TABLE daily_trips (
  id                   SERIAL PRIMARY KEY,
  route_id             INT  NOT NULL REFERENCES routes(id),
  bus_id               INT  NOT NULL REFERENCES buses(id),
  date                 DATE NOT NULL,
  scheduled_departure  TIMESTAMP NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','in_progress','completed','cancelled','delayed')),
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_trips_date     ON daily_trips(date);
CREATE INDEX idx_daily_trips_route_id ON daily_trips(route_id);
CREATE INDEX idx_daily_trips_bus_id   ON daily_trips(bus_id);

-- per-stop timing for each daily trip
CREATE TABLE trip_stops (
  id                   SERIAL PRIMARY KEY,
  daily_trip_id        INT NOT NULL REFERENCES daily_trips(id) ON DELETE CASCADE,
  station_id           INT NOT NULL REFERENCES stations(id),
  stop_order           INT NOT NULL,
  scheduled_arrival    TIMESTAMP,
  actual_arrival       TIMESTAMP,
  scheduled_departure  TIMESTAMP,
  actual_departure     TIMESTAMP,
  UNIQUE (daily_trip_id, stop_order)
);

-- users
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'passenger' CHECK (role IN ('admin','operator','passenger')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- passenger-reported trip intentions
CREATE TABLE trip_plans (
  id                SERIAL PRIMARY KEY,
  user_id           INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id          INT  NOT NULL REFERENCES routes(id),
  origin_station_id INT  NOT NULL REFERENCES stations(id),
  dest_station_id   INT  NOT NULL REFERENCES stations(id),
  planned_date      DATE NOT NULL,
  planned_time      TIME NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_plans_user_id      ON trip_plans(user_id);
CREATE INDEX idx_trip_plans_planned_date ON trip_plans(planned_date);

-- user assigned to a specific daily trip (result of approved AI patch)
CREATE TABLE user_trip_assignments (
  id             SERIAL PRIMARY KEY,
  trip_plan_id   INT NOT NULL REFERENCES trip_plans(id)   ON DELETE CASCADE,
  daily_trip_id  INT NOT NULL REFERENCES daily_trips(id),
  status         VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','boarded','missed')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (trip_plan_id)
);

-- camera data from bus
CREATE TABLE journey_logs (
  id              SERIAL PRIMARY KEY,
  daily_trip_id   INT NOT NULL REFERENCES daily_trips(id),
  timestamp       TIMESTAMP NOT NULL,
  passenger_count INT NOT NULL,
  event_type      VARCHAR(20) NOT NULL DEFAULT 'periodic' CHECK (event_type IN ('periodic','change')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journey_logs_daily_trip_id ON journey_logs(daily_trip_id);
CREATE INDEX idx_journey_logs_timestamp     ON journey_logs(timestamp);

-- station sensor data (arrival / departure)
CREATE TABLE station_events (
  id              SERIAL PRIMARY KEY,
  daily_trip_id   INT NOT NULL REFERENCES daily_trips(id),
  station_id      INT NOT NULL REFERENCES stations(id),
  event_type      VARCHAR(20) NOT NULL CHECK (event_type IN ('arrival','departure')),
  timestamp       TIMESTAMP NOT NULL,
  passenger_count INT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_station_events_daily_trip_id ON station_events(daily_trip_id);
CREATE INDEX idx_station_events_station_id    ON station_events(station_id);

-- events that wake the AI agent
CREATE TABLE ai_triggers (
  id            SERIAL PRIMARY KEY,
  trigger_type  VARCHAR(50) NOT NULL
                  CHECK (trigger_type IN ('pre_day_evaluation','low_occupancy','bus_full','high_demand')),
  route_id      INT REFERENCES routes(id),
  daily_trip_id INT REFERENCES daily_trips(id),
  payload       JSONB NOT NULL DEFAULT '{}',
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_triggers_status ON ai_triggers(status);

-- AI-proposed action sets, pending operator approval
CREATE TABLE ai_patches (
  id               SERIAL PRIMARY KEY,
  trigger_id       INT  NOT NULL REFERENCES ai_triggers(id),
  analysis         TEXT,
  proposed_actions JSONB NOT NULL DEFAULT '[]',
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','modified','rejected')),
  reviewed_by      INT REFERENCES users(id),
  reviewed_at      TIMESTAMP,
  applied_at       TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_patches_status ON ai_patches(status);

-- assistant sessions (deferred feature)
CREATE TABLE assistant_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMP,
  context    JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE assistant_messages (
  id         SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

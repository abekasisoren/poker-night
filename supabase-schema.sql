-- ============================================================
-- Poker Night Manager — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  location TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES players(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  response TEXT NOT NULL DEFAULT 'pending'
    CHECK (response IN ('yes', 'no', 'maybe', 'pending')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

CREATE TABLE bring_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  item TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('food', 'drinks', 'equipment', 'other')),
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  amount NUMERIC(10, 2) NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

CREATE INDEX idx_rsvps_session    ON rsvps(session_id);
CREATE INDEX idx_bring_sess       ON bring_items(session_id);
CREATE INDEX idx_results_session  ON results(session_id);
CREATE INDEX idx_results_player   ON results(player_id);
CREATE INDEX idx_sessions_date    ON sessions(date DESC);

-- Leaderboard view
CREATE VIEW leaderboard AS
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    COUNT(r.id) AS sessions_played,
    COALESCE(SUM(r.amount), 0) AS total_net,
    COALESCE(MAX(r.amount), 0) AS best_night,
    COALESCE(MIN(r.amount), 0) AS worst_night,
    COALESCE(AVG(r.amount), 0) AS avg_per_session,
    COUNT(r.id) FILTER (WHERE r.amount > 0) AS winning_sessions,
    COUNT(r.id) FILTER (WHERE r.amount < 0) AS losing_sessions
  FROM players p
  LEFT JOIN results r ON r.player_id = p.id
  GROUP BY p.id, p.name
  ORDER BY total_net DESC;

-- ============================================================
-- Seed players
-- ============================================================
INSERT INTO players (name) VALUES
  ('Oren'), ('Gil'), ('Kirshner'), ('Dino'),
  ('Eyal'), ('Ori'), ('Tomer'), ('Bumi'),
  ('Saar'), ('Mickey'), ('Yoav'), ('Danai'),
  ('Proper'), ('Gaddi');

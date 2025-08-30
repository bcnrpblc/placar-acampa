-- Create teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color varchar(7) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create rounds table
CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) NOT NULL,
  day date NOT NULL,
  round_number integer DEFAULT 1,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create score_entries table (atomic point events)
CREATE TABLE score_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES rounds(id) NOT NULL,
  team_id uuid REFERENCES teams(id) NOT NULL,
  player_id uuid REFERENCES players(id),
  points integer NOT NULL,
  reason text,
  meta jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create team_aggregates for fast reads
CREATE TABLE team_aggregates (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  total_points bigint NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Create daily_snapshots for day reveals
CREATE TABLE daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  snapshot jsonb NOT NULL,
  locked_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to core data
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Rounds are viewable by everyone" ON rounds FOR SELECT USING (true);
CREATE POLICY "Score entries are viewable by everyone" ON score_entries FOR SELECT USING (true);
CREATE POLICY "Team aggregates are viewable by everyone" ON team_aggregates FOR SELECT USING (true);
CREATE POLICY "Daily snapshots are viewable by everyone" ON daily_snapshots FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_score_entries_team_createdat ON score_entries(team_id, created_at DESC);
CREATE INDEX idx_score_entries_player_createdat ON score_entries(player_id, created_at DESC);
CREATE INDEX idx_rounds_game_day ON rounds(game_id, day);
CREATE INDEX idx_score_entries_round ON score_entries(round_id);

-- Seed teams data
INSERT INTO teams (name, color) VALUES 
  ('Blue', '#3b82f6'),
  ('Red', '#ef4444'),
  ('Green', '#10b981'),
  ('Yellow', '#f59e0b'),
  ('Purple', '#8b5cf6'),
  ('Orange', '#f97316'),
  ('Pink', '#ee1147'),
  ('Black', '#1f2937'),
  ('Grey', '#6b7280'),
  ('Brown', '#92400e');

-- Initialize team aggregates
INSERT INTO team_aggregates (team_id, total_points)
SELECT id, 0 FROM teams;

-- Seed sample games
INSERT INTO games (slug, title, description) VALUES
  ('night-game', 'Night Game', 'Epic nighttime camp challenge'),
  ('m-and-m', 'M&M Challenge', 'Sweet sorting competition'),
  ('ctrl-c-ctrl-v', 'Ctrl+C Ctrl+V', 'Memory and repetition game'),
  ('brega', 'Brega Battle', 'Ultimate camp showdown'),
  ('misc-challenges', 'Misc Challenges', 'Various camp activities');

-- Enable realtime for live updates
ALTER TABLE team_aggregates REPLICA IDENTITY FULL;
ALTER TABLE score_entries REPLICA IDENTITY FULL;
ALTER TABLE daily_snapshots REPLICA IDENTITY FULL;
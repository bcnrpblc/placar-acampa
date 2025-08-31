-- Seed teams table with the 10 camp teams
INSERT INTO teams (name, color, avatar_url) VALUES
  ('Blue', '#23dbf3', '/src/assets/team-blue.png'),
  ('Red', '#ee1147', '/src/assets/team-red.png'),
  ('Green', '#22c55e', '/src/assets/team-green.png'),
  ('Yellow', '#eab308', NULL),
  ('Purple', '#a855f7', NULL),
  ('Orange', '#f97316', NULL),
  ('Pink', '#ec4899', NULL),
  ('Black', '#1f2937', NULL),
  ('Grey', '#6b7280', NULL),
  ('Brown', '#92400e', NULL)
ON CONFLICT (name) DO UPDATE SET
  color = EXCLUDED.color,
  avatar_url = EXCLUDED.avatar_url;

-- Seed games table with camp activities
INSERT INTO games (slug, title, description) VALUES
  ('night-game', 'Night Game', 'Evening outdoor challenge activity'),
  ('m-and-m', 'M&M Challenge', 'Team building exercise with candy'),
  ('ctrl-c-ctrl-v', 'Ctrl+C Ctrl+V', 'Tech-themed coding challenge'),
  ('brega', 'Brega', 'Brazilian music and dance competition'),
  ('misc-challenges', 'Misc Challenges', 'Various team challenges throughout the camp')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE team_aggregates;
ALTER PUBLICATION supabase_realtime ADD TABLE score_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_snapshots;
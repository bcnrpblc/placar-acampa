-- Participants + per-event scoring mode. Run once in the SQL editor on a DB
-- that already has bootstrap.sql applied. (bootstrap.sql contains the same.)

DO $$ BEGIN
  CREATE TYPE public.scoring_mode AS ENUM ('team', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 'team' = points go to the team only; 'individual' = points go to
-- participants and accrue to their team.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS scoring_mode public.scoring_mode NOT NULL DEFAULT 'team';

-- Players belong to an event directly (team is optional until assigned).
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name_key text;

UPDATE public.players p SET event_id = t.event_id
  FROM public.teams t WHERE p.team_id = t.id AND p.event_id IS NULL;
DELETE FROM public.players WHERE event_id IS NULL;
UPDATE public.players SET name_key = lower(btrim(name)) WHERE name_key IS NULL;

ALTER TABLE public.players
  ALTER COLUMN event_id SET NOT NULL,
  ALTER COLUMN name_key SET NOT NULL;

-- Unique participant key within an event (normalized name, computed by the app).
CREATE UNIQUE INDEX IF NOT EXISTS players_event_name_key
  ON public.players (event_id, name_key);
CREATE INDEX IF NOT EXISTS idx_players_event ON public.players (event_id);

-- Write policies now key off players.event_id (unassigned players allowed).
DROP POLICY IF EXISTS "Admins can insert players" ON public.players;
DROP POLICY IF EXISTS "Admins can update players" ON public.players;
DROP POLICY IF EXISTS "Admins can delete players" ON public.players;

CREATE POLICY "Admins can insert players"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update players"
  ON public.players FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can delete players"
  ON public.players FOR DELETE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));

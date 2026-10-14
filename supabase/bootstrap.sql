-- =============================================================================
-- Placar Acampa — single-file bootstrap for a fresh Supabase project
-- =============================================================================
-- How to use:
--   1. Create a new Supabase project (or reset an empty one)
--   2. SQL Editor → paste this entire file → Run
--   3. Copy Project URL + anon key into .env
--   4. Sign up as flavioangeleu@gmail.com (auto-promoted to admin)
--   5. Assign other admins from /admin/roles
--   6. Create events and teams/games from the admin UI (no seed data)
--
-- NOTE: This script assumes a clean public schema for placar tables.
-- If you already ran an older bootstrap, drop those tables first or use a new project.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft', 'live', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 'team' = points go to the team only; 'individual' = points go to
-- participants and accrue to their team.
DO $$ BEGIN
  CREATE TYPE public.scoring_mode AS ENUM ('team', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Events (top-level placar instance)
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text, -- optional line under the title on the public scoreboard
  status public.event_status NOT NULL DEFAULT 'draft',
  scoring_mode public.scoring_mode NOT NULL DEFAULT 'team',
  starts_at timestamptz,
  ended_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  theme jsonb, -- reserved for future theming / AI themes; unused in Phase 1
  final_snapshot jsonb, -- written when event is ended
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Core tables (scoped to event)
-- ---------------------------------------------------------------------------
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  color varchar(7) NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, name)
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_key text NOT NULL, -- normalized name (app-computed): unique key per event
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, name_key)
);

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, slug)
);

CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  day date NOT NULL,
  round_number integer DEFAULT 1,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.score_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id),
  points integer NOT NULL,
  reason text,
  meta jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Explicit event_id on aggregates (composite PK)
CREATE TABLE public.team_aggregates (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  total_points bigint NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, team_id)
);

CREATE TABLE public.daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day date NOT NULL,
  snapshot jsonb NOT NULL,
  locked_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, day)
);

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  admin_identifier text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_teams_event ON public.teams(event_id);
CREATE INDEX idx_games_event ON public.games(event_id);
CREATE INDEX idx_team_aggregates_event ON public.team_aggregates(event_id);
CREATE INDEX idx_score_entries_team_createdat ON public.score_entries(team_id, created_at DESC);
CREATE INDEX idx_score_entries_player_createdat ON public.score_entries(player_id, created_at DESC);
CREATE INDEX idx_rounds_game_day ON public.rounds(game_id, day);
CREATE INDEX idx_score_entries_round ON public.score_entries(round_id);
CREATE INDEX idx_daily_snapshots_event ON public.daily_snapshots(event_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'flavioangeleu@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.event_is_writable(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND status <> 'ended'::public.event_status
  );
$$;

CREATE OR REPLACE FUNCTION public.increment_team_points(
  target_event_id uuid,
  target_team_id uuid,
  points_to_add integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.event_is_writable(target_event_id) THEN
    RAISE EXCEPTION 'Event is ended; scores cannot be changed';
  END IF;

  INSERT INTO public.team_aggregates (event_id, team_id, total_points, last_updated)
  VALUES (target_event_id, target_team_id, points_to_add, now())
  ON CONFLICT (event_id, team_id)
  DO UPDATE SET
    total_points = public.team_aggregates.total_points + points_to_add,
    last_updated = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_players_public()
RETURNS TABLE (
  id uuid,
  name text,
  team_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.team_id, p.created_at
  FROM public.players p;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_role(target_user_id uuid, role_to_add public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, role_to_add)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_role(target_user_id uuid, role_to_remove public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;

  IF role_to_remove = 'admin'::public.app_role
     AND public.is_superadmin(target_user_id) THEN
    RAISE EXCEPTION 'Cannot revoke admin from the superadmin account';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = role_to_remove;

  RETURN true;
END;
$$;

-- Finalize event: lock + optional final standings snapshot
CREATE OR REPLACE FUNCTION public.end_event(target_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  standings jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = target_event_id AND status <> 'ended'::public.event_status
  ) THEN
    RAISE EXCEPTION 'Event not found or already ended';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.total_points DESC), '[]'::jsonb)
  INTO standings
  FROM (
    SELECT
      t.id AS team_id,
      t.name,
      t.color,
      t.avatar_url,
      COALESCE(a.total_points, 0) AS total_points
    FROM public.teams t
    LEFT JOIN public.team_aggregates a
      ON a.team_id = t.id AND a.event_id = t.event_id
    WHERE t.event_id = target_event_id
  ) s;

  UPDATE public.events
  SET
    status = 'ended'::public.event_status,
    ended_at = now(),
    final_snapshot = standings,
    updated_at = now()
  WHERE id = target_event_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  IF lower(NEW.email) = 'flavioangeleu@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'flavioangeleu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Auto-create aggregate row when a team is created
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_aggregates (event_id, team_id, total_points)
  VALUES (NEW.event_id, NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT USING (true);
CREATE POLICY "Teams are viewable by everyone"
  ON public.teams FOR SELECT USING (true);
CREATE POLICY "Players public info viewable by everyone"
  ON public.players FOR SELECT USING (true);
CREATE POLICY "Games are viewable by everyone"
  ON public.games FOR SELECT USING (true);
CREATE POLICY "Rounds are viewable by everyone"
  ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Score entries are viewable by everyone"
  ON public.score_entries FOR SELECT USING (true);
CREATE POLICY "Team aggregates are viewable by everyone"
  ON public.team_aggregates FOR SELECT USING (true);
CREATE POLICY "Daily snapshots are viewable by everyone"
  ON public.daily_snapshots FOR SELECT USING (true);
CREATE POLICY "Admin audit logs viewable by everyone"
  ON public.admin_audit_log FOR SELECT USING (true);
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

-- Roles
CREATE POLICY "Users can view own or all roles if admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Restrict direct inserts on user_roles"
  ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Restrict direct updates on user_roles"
  ON public.user_roles FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Restrict direct deletes on user_roles"
  ON public.user_roles FOR DELETE TO authenticated USING (false);

-- Profiles
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Events: admins manage; cannot update once ended (except end_event RPC).
-- Delete is allowed in any status and cascades to all event data.
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update writable events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.is_admin() AND status <> 'ended'::public.event_status);

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.is_admin());

-- Teams / games: admin writes only while event is writable
CREATE POLICY "Admins can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));

CREATE POLICY "Admins can insert games"
  ON public.games FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update games"
  ON public.games FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can delete games"
  ON public.games FOR DELETE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));

CREATE POLICY "Admins can insert players"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update players"
  ON public.players FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can delete players"
  ON public.players FOR DELETE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id)
  );

CREATE POLICY "Admins can insert rounds"
  ON public.rounds FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id AND public.event_is_writable(g.event_id)
    )
  );

CREATE POLICY "Admins can insert score entries"
  ON public.score_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND public.event_is_writable(t.event_id)
    )
  );

CREATE POLICY "Admins can insert team aggregates"
  ON public.team_aggregates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update team aggregates"
  ON public.team_aggregates FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));

CREATE POLICY "Admins can insert daily snapshots"
  ON public.daily_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.event_is_writable(event_id));
CREATE POLICY "Admins can update daily snapshots"
  ON public.daily_snapshots FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.event_is_writable(event_id));

CREATE POLICY "Enable audit log creation"
  ON public.admin_audit_log FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.game_team_scores
WITH (security_invoker = true)
AS
SELECT
  g.event_id,
  g.id AS game_id,
  g.title AS game_title,
  t.id AS team_id,
  t.name AS team_name,
  t.color AS team_color,
  t.avatar_url AS team_avatar,
  COALESCE(SUM(se.points), 0)::bigint AS total_points
FROM public.games g
JOIN public.rounds r ON r.game_id = g.id
JOIN public.score_entries se ON se.round_id = r.id
JOIN public.teams t ON t.id = se.team_id
GROUP BY g.event_id, g.id, g.title, t.id, t.name, t.color, t.avatar_url;

GRANT SELECT ON public.game_team_scores TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_aggregates REPLICA IDENTITY FULL;
ALTER TABLE public.score_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_aggregates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.score_entries;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_snapshots;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- Storage: team mascots
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-mascots',
  'team-mascots',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read team mascots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-mascots');

CREATE POLICY "Admins upload team mascots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-mascots' AND public.is_admin());

CREATE POLICY "Admins update team mascots"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-mascots' AND public.is_admin());

CREATE POLICY "Admins delete team mascots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-mascots' AND public.is_admin());

-- No seed data — admins create events, teams, and games in the UI.

-- Participant avatars (files live in the team-mascots bucket under <event id>/players/).
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url text;

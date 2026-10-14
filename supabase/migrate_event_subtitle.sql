-- Optional subtitle shown under the event name on the public scoreboard.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS subtitle text;

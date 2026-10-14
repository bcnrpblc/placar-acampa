-- Per-event editable reveal texts: { day: {...}, game: {...}, final: {...} }. NULL = built-in defaults.
ALTER TABLE events ADD COLUMN IF NOT EXISTS reveal_texts jsonb;

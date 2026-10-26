-- Optional winner/top-3 photo shown on the reveal pages (separate from the small avatar).
ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_url text;

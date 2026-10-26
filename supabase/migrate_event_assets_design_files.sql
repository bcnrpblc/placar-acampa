-- Design system imports upload PDFs and text files (.md/.txt/.html/.css/.json, sent as text/plain) to event-assets.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
WHERE id = 'event-assets';

-- Public bucket for event design images, logos and background images.
-- Paths: <event_id>/design-<ts>.ext, <event_id>/logo-<ts>.ext, <event_id>/bg-<ts>.ext
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  true,
  8388608,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read event assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');

CREATE POLICY "Admins upload event assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-assets' AND public.is_admin());

CREATE POLICY "Admins update event assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-assets' AND public.is_admin());

CREATE POLICY "Admins delete event assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-assets' AND public.is_admin());

-- Allow admins to delete an event in any status (cascades to teams, games,
-- players, scores, aggregates, snapshots). Run once on an already-bootstrapped DB.
DROP POLICY IF EXISTS "Admins can delete writable events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.is_admin());

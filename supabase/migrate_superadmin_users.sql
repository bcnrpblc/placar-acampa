-- Superadmin-only user management + privacy lockdown. Run once in the SQL editor
-- on a DB that already has bootstrap.sql applied. (bootstrap.sql contains the same.)

-- Only the superadmin can grant or revoke roles.
CREATE OR REPLACE FUNCTION public.admin_add_role(target_user_id uuid, role_to_add public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
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
  IF NOT public.is_superadmin() THEN
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

-- Emails are no longer public: own row, or any row for admins.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by self or admins"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Audit log: admins only (read and write).
DROP POLICY IF EXISTS "Admin audit logs viewable by everyone" ON public.admin_audit_log;
CREATE POLICY "Admin audit logs viewable by admins"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS "Enable audit log creation" ON public.admin_audit_log;
CREATE POLICY "Admins can create audit logs"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

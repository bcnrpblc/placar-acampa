-- RBAC: roles and admin check

-- 1. Create enum for roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Policies: users can see their own roles; no public inserts/updates/deletes
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Restrict inserts on user_roles" ON public.user_roles;
CREATE POLICY "Restrict inserts on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Restrict updates on user_roles" ON public.user_roles;
CREATE POLICY "Restrict updates on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Restrict deletes on user_roles" ON public.user_roles;
CREATE POLICY "Restrict deletes on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- 5. Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- 6. Convenience function: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
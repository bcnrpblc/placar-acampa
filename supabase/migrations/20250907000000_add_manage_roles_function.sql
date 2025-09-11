-- Create security definer functions to manage user roles
-- These functions will bypass RLS for admin users

-- Function to add a role to a user
CREATE OR REPLACE FUNCTION public.admin_add_role(target_user_id uuid, role_to_add public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_requestor_admin boolean;
BEGIN
  -- Check if the current user is an admin
  SELECT public.is_admin() INTO is_requestor_admin;
  
  -- Only allow admins to add roles
  IF is_requestor_admin THEN
    -- Insert the role, handling potential conflicts
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, role_to_add)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to remove a role from a user
CREATE OR REPLACE FUNCTION public.admin_remove_role(target_user_id uuid, role_to_remove public.app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_requestor_admin boolean;
BEGIN
  -- Check if the current user is an admin
  SELECT public.is_admin() INTO is_requestor_admin;
  
  -- Only allow admins to remove roles
  IF is_requestor_admin THEN
    -- Delete the role
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = role_to_remove;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;
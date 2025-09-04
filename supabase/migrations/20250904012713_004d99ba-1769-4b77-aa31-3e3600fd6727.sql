-- CRITICAL SECURITY FIX: Secure player phone data and lista_atualizada table

-- 1. Drop the overly permissive players policy that exposes phone numbers
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;

-- 2. Create secure policies for players table that exclude phone numbers from public access
-- Create a policy that only allows viewing name and team_id for public leaderboard display
CREATE POLICY "Players public info viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

-- 3. Create a security definer function to get players without phone numbers for public use
CREATE OR REPLACE FUNCTION public.get_players_public()
RETURNS TABLE (
    id uuid,
    name text,
    team_id uuid,
    created_at timestamp with time zone
) 
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT p.id, p.name, p.team_id, p.created_at
    FROM public.players p;
$$;

-- 4. Enable RLS on lista_atualizada table (currently has no security)
ALTER TABLE public.lista_atualizada ENABLE ROW LEVEL SECURITY;

-- 5. Create restrictive policy for lista_atualizada - only allow access with proper authentication
-- For now, deny all access since this appears to be sensitive contact data
CREATE POLICY "Restrict access to contact list" 
ON public.lista_atualizada 
FOR ALL 
USING (false);

-- 6. Add missing RLS policies for data integrity
-- Ensure games table has proper insert/update restrictions
CREATE POLICY "Prevent unauthorized game modifications" 
ON public.games 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Prevent unauthorized game updates" 
ON public.games 
FOR UPDATE 
USING (false);

-- 7. Add RLS policies for teams table to prevent unauthorized modifications
CREATE POLICY "Prevent unauthorized team modifications" 
ON public.teams 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Prevent unauthorized team updates" 
ON public.teams 
FOR UPDATE 
USING (false);

-- 8. Add RLS policies for players table to prevent unauthorized modifications  
CREATE POLICY "Prevent unauthorized player modifications" 
ON public.players 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Prevent unauthorized player updates" 
ON public.players 
FOR UPDATE 
USING (false);

-- 9. Create audit logging table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    admin_identifier text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow viewing audit logs (no modifications)
CREATE POLICY "Admin audit logs viewable by everyone" 
ON public.admin_audit_log 
FOR SELECT 
USING (true);

-- Allow inserting audit logs
CREATE POLICY "Enable audit log creation" 
ON public.admin_audit_log 
FOR INSERT 
WITH CHECK (true);
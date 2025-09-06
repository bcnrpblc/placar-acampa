-- Grant admin role to the main administrator
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'flavioangeleu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
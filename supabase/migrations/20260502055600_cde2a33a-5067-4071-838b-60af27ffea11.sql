-- Re-attach the user-onboarding trigger that was lost. Without it new
-- signups never get a profile row and the AdminLogin "Create admin account"
-- path never receives the super_admin / admin / editor roles, so nobody
-- can pass the admin gate.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: every existing auth user gets a profile + (if they signed up
-- as an admin or are the bootstrap email) the admin role bundle.
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('super_admin'::app_role), ('admin'::app_role), ('editor'::app_role)) AS r(role)
WHERE LOWER(u.email) = 'savannahsafarisadmin@gmail.com'
   OR COALESCE(u.raw_user_meta_data->>'account_type', '') = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
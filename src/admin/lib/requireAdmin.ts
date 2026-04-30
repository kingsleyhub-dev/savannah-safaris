import { supabase } from "@/integrations/supabase/client";
import { hasRequiredRole, type AdminRole, ADMIN_PORTAL_ROLES } from "@/admin/auth/permissions";

/**
 * Defense-in-depth: verify the current session has an admin role
 * before issuing any admin mutation. The DB RLS is the real gate,
 * but this prevents wasted requests and gives a clean error message.
 */
export const requireAdmin = async (allowed: AdminRole[] = ADMIN_PORTAL_ROLES) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: rows, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw new Error("Could not verify your permissions.");
  const roles = (rows ?? []).map((row) => row.role as AdminRole);
  if (!hasRequiredRole(roles, allowed)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return { user, roles };
};

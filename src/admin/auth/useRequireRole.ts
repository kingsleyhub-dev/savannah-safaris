import { useAuth } from "./AuthProvider";
import { hasRequiredRole, type AdminRole, ADMIN_PORTAL_ROLES } from "./permissions";

/**
 * Client-side defense-in-depth role check.
 * The database RLS is the authoritative gate, but this prevents non-admin UI
 * from ever rendering or firing admin mutations even if a route is reached directly.
 */
export const useRequireRole = (allowed: AdminRole[] = ADMIN_PORTAL_ROLES) => {
  const { roles, isAdmin, loading, rolesLoading, user } = useAuth();
  const ready = !loading && !rolesLoading;
  const allowedNow = ready && !!user && isAdmin && hasRequiredRole(roles, allowed);
  return { ready, allowed: allowedNow, roles };
};

/** Throw before calling any admin Supabase mutation. */
export const assertRole = (roles: AdminRole[], allowed: AdminRole[]) => {
  if (!hasRequiredRole(roles, allowed)) {
    throw new Error("You do not have permission to perform this action.");
  }
};

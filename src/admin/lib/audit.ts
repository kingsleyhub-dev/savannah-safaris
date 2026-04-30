import { supabase } from "@/integrations/supabase/client";
import { hasRequiredRole, ADMIN_PORTAL_ROLES, type AdminRole } from "@/admin/auth/permissions";

export const logAudit = async (
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Defense-in-depth: only admins should write to the audit log.
  // RLS will reject otherwise, but we avoid the failed insert.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role as AdminRole);
  if (!hasRequiredRole(roles, ADMIN_PORTAL_ROLES)) return;

  await supabase.from("audit_log").insert([{
    actor_id: user.id,
    actor_email: user.email ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: (metadata ?? null) as never,
  }]);
};

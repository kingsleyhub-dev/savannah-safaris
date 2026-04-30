import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useRequireRole } from "./useRequireRole";
import { ADMIN_PORTAL_ROLES, type AdminRole } from "./permissions";

interface Props {
  allowed?: AdminRole[];
  children: ReactNode;
}

/**
 * Wrap admin page content so it never renders for unauthorised users,
 * even if the route guard is bypassed or roles change mid-session.
 */
export const RoleGate = ({ allowed = ADMIN_PORTAL_ROLES, children }: Props) => {
  const { ready, allowed: ok } = useRequireRole(allowed);

  if (!ready) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <div className="max-w-sm space-y-2">
          <h2 className="font-display text-xl font-bold">Permission required</h2>
          <p className="text-sm text-muted-foreground">
            Your account does not have access to this admin area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

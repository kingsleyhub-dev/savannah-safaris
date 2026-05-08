import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/admin/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Image as ImageIcon, Phone, Settings, LogOut, Menu, X, ExternalLink, Users, Images } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTENT_MANAGER_ROLES, MEDIA_MANAGER_ROLES, SETTINGS_MANAGER_ROLES, USER_MANAGER_ROLES, hasRequiredRole } from "@/admin/auth/permissions";
import { RoleGate } from "@/admin/auth/RoleGate";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/dashboard/users", label: "Users", icon: Users, allowedRoles: USER_MANAGER_ROLES },
  { to: "/admin/dashboard/pages", label: "Pages", icon: FileText, allowedRoles: CONTENT_MANAGER_ROLES },
  { to: "/admin/dashboard/gallery", label: "Gallery Manager", icon: Images, allowedRoles: MEDIA_MANAGER_ROLES },
  { to: "/admin/dashboard/media", label: "Media Library", icon: ImageIcon, allowedRoles: MEDIA_MANAGER_ROLES },
  { to: "/admin/dashboard/contact", label: "Contact", icon: Phone, allowedRoles: SETTINGS_MANAGER_ROLES },
  { to: "/admin/dashboard/settings", label: "Settings", icon: Settings, allowedRoles: SETTINGS_MANAGER_ROLES },
];

export const AdminLayout = () => {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const visibleNav = nav.filter((item) => !item.allowedRoles || hasRequiredRole(roles, item.allowedRoles));

  const handleSignOut = async () => { await signOut(); navigate("/admin"); };

  return (
    <div className="min-h-screen flex bg-secondary/30">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-lg leading-tight">Admin</p>
            <p className="text-xs text-muted-foreground">Savannah Safaris</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="size-5" /></button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}>
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-smooth">
            <ExternalLink className="size-3.5" /> View live site
          </a>
          <div className="px-3 py-2 text-xs">
            <p className="font-medium truncate">{user?.email}</p>
            <p className="text-muted-foreground capitalize">{roles[0]?.replace("_", " ") ?? "admin"}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <p className="font-display font-bold">Admin</p>
          <div className="size-5" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <RoleGate>
            <Outlet />
          </RoleGate>
        </main>
      </div>
    </div>
  );
};

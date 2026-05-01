import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/admin/auth/AuthProvider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const links = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/property", label: "The Stay" },
  { to: "/gallery", label: "Gallery" },
  { to: "/services", label: "Services" },
  { to: "/location", label: "Location" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-elegant",
        scrolled || open
          ? "bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-soft"
          : "bg-transparent"
      )}
    >
      <div className="container-luxe flex items-center justify-between h-20">
        <Logo variant={scrolled || open ? "dark" : "light"} />

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-smooth",
                  scrolled
                    ? "text-foreground/80 hover:text-primary hover:bg-secondary"
                    : "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10",
                  isActive && (scrolled ? "text-primary bg-secondary" : "text-primary-foreground bg-white/15")
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={scrolled ? "outline" : "ghost"} size="sm" className={cn(!scrolled && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}>
                  <User className="size-4" />
                  My Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-bookings"><CalendarCheck className="size-4" /> My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading ? (
            <>
              <Button asChild variant={scrolled ? "ghost" : "ghost"} size="sm" className={cn(!scrolled && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          ) : null}
          <Button asChild variant="hero" size="sm">
            <Link to="/booking">Book Now</Link>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "lg:hidden p-2 rounded-full transition-smooth",
            scrolled || open ? "text-primary hover:bg-secondary" : "text-primary-foreground hover:bg-white/10"
          )}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="container-luxe py-6 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-3 rounded-xl text-base font-medium transition-smooth",
                    isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            {!loading && user ? (
              <>
                <NavLink to="/my-bookings" className="px-4 py-3 rounded-xl text-base font-medium text-foreground hover:bg-secondary flex items-center gap-2">
                  <CalendarCheck className="size-4" /> My Bookings
                </NavLink>
                <Button onClick={handleSignOut} variant="outline" size="lg" className="mt-2">
                  <LogOut className="size-4" /> Sign out
                </Button>
              </>
            ) : !loading ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button asChild variant="outline" size="lg"><Link to="/signin">Sign In</Link></Button>
                <Button asChild variant="hero" size="lg"><Link to="/signup">Sign Up</Link></Button>
              </div>
            ) : null}
            <Button asChild variant="hero" size="lg" className="mt-4">
              <Link to="/booking">Book Now</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};
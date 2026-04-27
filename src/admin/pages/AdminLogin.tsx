import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/admin/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_PORTAL_ROLES, hasRequiredRole } from "@/admin/auth/permissions";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, roles, isAdmin, loading, rolesLoading, signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !rolesLoading && user && isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [loading, rolesLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!loading && !rolesLoading && user && !hasRequiredRole(roles, ADMIN_PORTAL_ROLES)) {
      toast.error("Your account is signed in, but it does not have admin access.");
    }
  }, [loading, rolesLoading, user, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) { toast.error(emailParsed.error.issues[0].message); return; }

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(emailParsed.data);
        if (error) { toast.error(error); return; }
        toast.success("Password reset email sent");
        setMode("signin");
        return;
      }

      const pwParsed = passwordSchema.safeParse(password);
      if (!pwParsed.success) { toast.error(pwParsed.error.issues[0].message); return; }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: pwParsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`,
            data: { account_type: "admin" },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Account created. Signing you in…");
        await signIn(emailParsed.data, pwParsed.data);
        return;
      }

      const { error } = await signIn(emailParsed.data, pwParsed.data);
      if (error) { toast.error(error); return; }
      toast.success("Welcome back");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="text-center mb-8 space-y-2">
          <div className="size-14 rounded-2xl gradient-forest text-primary-foreground grid place-items-center mx-auto">
            <Lock className="size-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" && "Sign in with your admin credentials"}
            {mode === "signup" && "Create your admin account"}
            {mode === "forgot" && "Enter your email to reset your password"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10" placeholder="you@example.com"
                required autoComplete="email" autoFocus
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10" placeholder="••••••••"
                  required minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {mode === "signin" && "Sign in"}
            {mode === "signup" && "Create account"}
            {mode === "forgot" && "Send reset email"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            {mode === "signin" ? (
              <>
                <button type="button" onClick={() => setMode("signup")} className="text-muted-foreground hover:text-primary">
                  Create admin account
                </button>
                <button type="button" onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-primary">
                  Forgot password?
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setMode("signin")} className="text-muted-foreground hover:text-primary mx-auto">
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;

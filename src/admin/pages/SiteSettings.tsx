import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";

interface Branding { name: string; tagline: string; }
type VercelEnvironment = "development" | "staging" | "production";
type VercelChecklist = Record<VercelEnvironment, Record<string, boolean>>;

const VERCEL_ENVIRONMENTS: { value: VercelEnvironment; label: string; hint: string }[] = [
  { value: "development", label: "Dev", hint: "Local and development deployments" },
  { value: "staging", label: "Staging", hint: "Preview deployment validation" },
  { value: "production", label: "Production", hint: "Live deployment readiness" },
];

const REQUIRED_VERCEL_VARIABLES = [
  { key: "VITE_SUPABASE_URL", label: "Backend URL" },
  { key: "VITE_SUPABASE_PUBLISHABLE_KEY", label: "Publishable API key" },
  { key: "VITE_SUPABASE_PROJECT_ID", label: "Project ID" },
];

const createEmptyChecklist = (): VercelChecklist =>
  VERCEL_ENVIRONMENTS.reduce((acc, { value }) => {
    acc[value] = REQUIRED_VERCEL_VARIABLES.reduce<Record<string, boolean>>((vars, { key }) => {
      vars[key] = false;
      return vars;
    }, {});
    return acc;
  }, {} as VercelChecklist);

const normalizeChecklist = (value: unknown): VercelChecklist => {
  const base = createEmptyChecklist();
  const stored = value as Partial<Record<VercelEnvironment, Record<string, boolean>>> | null;

  VERCEL_ENVIRONMENTS.forEach(({ value: env }) => {
    REQUIRED_VERCEL_VARIABLES.forEach(({ key }) => {
      base[env][key] = Boolean(stored?.[env]?.[key]);
    });
  });

  return base;
};

const SiteSettings = () => {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [checklist, setChecklist] = useState<VercelChecklist>(() => createEmptyChecklist());
  const [selectedEnvironment, setSelectedEnvironment] = useState<VercelEnvironment>("development");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "vercel_environment_checklist").maybeSingle(),
    ]).then(([brandingResult, checklistResult]) => {
      setBranding((brandingResult.data?.value as unknown as Branding) ?? { name: "", tagline: "" });
      setChecklist(normalizeChecklist(checklistResult.data?.value));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!branding) return;
    if (!branding.name.trim()) { toast.error("Brand name is required"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("site_settings")
      .update({ value: branding as never, updated_by: user?.id })
      .eq("key", "branding");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Branding updated");
    await logAudit("update", "site_setting", "branding");
  };

  const saveChecklist = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "vercel_environment_checklist")
      .maybeSingle();

    const payload = {
      key: "vercel_environment_checklist",
      value: checklist as never,
      description: "Tracks required Vercel environment variables by deployment target.",
      updated_by: user?.id,
    };

    const { error } = existing?.id
      ? await supabase.from("site_settings").update(payload).eq("id", existing.id)
      : await supabase.from("site_settings").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Environment checklist updated");
    await logAudit("update", "site_setting", "vercel_environment_checklist");
  };

  const selectedItems = checklist[selectedEnvironment];
  const completedCount = REQUIRED_VERCEL_VARIABLES.filter(({ key }) => selectedItems[key]).length;

  if (loading || !branding) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Site-wide branding and configuration.</p>
      </div>

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-lg font-bold">Branding</h2>
        <div className="space-y-2"><Label>Brand name</Label>
          <Input value={branding.name} onChange={(e) => setBranding({ ...branding, name: e.target.value })} maxLength={80} />
        </div>
        <div className="space-y-2"><Label>Tagline</Label>
          <Input value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} maxLength={160} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Vercel environment checklist</h2>
            <p className="text-sm text-muted-foreground mt-1">Track required variables separately for each target deployment.</p>
          </div>
          <Badge variant={completedCount === REQUIRED_VERCEL_VARIABLES.length ? "default" : "secondary"}>
            {completedCount}/{REQUIRED_VERCEL_VARIABLES.length} ready
          </Badge>
        </div>

        <div className="space-y-2">
          <Label>Target deployment</Label>
          <Select value={selectedEnvironment} onValueChange={(value) => setSelectedEnvironment(value as VercelEnvironment)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose environment" />
            </SelectTrigger>
            <SelectContent>
              {VERCEL_ENVIRONMENTS.map((environment) => (
                <SelectItem key={environment.value} value={environment.value}>{environment.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {VERCEL_ENVIRONMENTS.find((environment) => environment.value === selectedEnvironment)?.hint}
          </p>
        </div>

        <div className="rounded-lg border divide-y">
          {REQUIRED_VERCEL_VARIABLES.map(({ key, label }) => {
            const checked = selectedItems[key];
            return (
              <label key={key} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => setChecklist((current) => ({
                    ...current,
                    [selectedEnvironment]: {
                      ...current[selectedEnvironment],
                      [key]: value === true,
                    },
                  }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground font-mono break-all">{key}</p>
                </div>
                {checked ? <CheckCircle2 className="size-5 text-primary shrink-0" /> : <Circle className="size-5 text-muted-foreground shrink-0" />}
              </label>
            );
          })}
        </div>

        <Button onClick={saveChecklist} disabled={saving} variant="secondary">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save checklist
        </Button>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display text-lg font-bold">Payments (Phase 2)</h2>
        <p className="text-sm text-muted-foreground">
          Card payments via Stripe, M-Pesa STK Push, and PayPal will be wired up in the next phase.
          The database is already prepared to record transactions.
        </p>
      </Card>
    </div>
  );
};

export default SiteSettings;

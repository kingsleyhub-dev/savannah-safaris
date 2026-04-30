import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { requireAdmin } from "../lib/requireAdmin";
import { SETTINGS_MANAGER_ROLES } from "@/admin/auth/permissions";
import { z } from "zod";

interface ContactValue {
  whatsapp_primary: { label: string; number: string };
  whatsapp_secondary: { label: string; number: string };
  email: string;
  location: string;
}

const phone = z.string().trim().min(7).max(20).regex(/^[+0-9 \-()]+$/, "Use digits, +, -, spaces only");
const schema = z.object({
  whatsapp_primary: z.object({ label: z.string().trim().min(1).max(40), number: phone }),
  whatsapp_secondary: z.object({ label: z.string().trim().min(1).max(40), number: phone }),
  email: z.string().trim().email().max(255),
  location: z.string().trim().min(1).max(120),
});

const ContactSettings = () => {
  const [val, setVal] = useState<ContactValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle().then(({ data }) => {
      setVal((data?.value as unknown as ContactValue) ?? null);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!val) return;
    const parsed = schema.safeParse(val);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      const { user } = await requireAdmin(SETTINGS_MANAGER_ROLES);
      const { error } = await supabase.from("site_settings")
        .update({ value: parsed.data as never, updated_by: user.id })
        .eq("key", "contact");
      if (error) { toast.error(error.message); return; }
      toast.success("Contact info updated — live on site");
      await logAudit("update", "site_setting", "contact");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !val) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Contact Info</h1>
        <p className="text-muted-foreground mt-1">These details appear across the public website.</p>
      </div>

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Phone className="size-4" /> WhatsApp Contacts</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Primary name</Label>
            <Input value={val.whatsapp_primary.label} onChange={(e) => setVal({ ...val, whatsapp_primary: { ...val.whatsapp_primary, label: e.target.value } })} />
          </div>
          <div className="space-y-2"><Label>Primary number</Label>
            <Input value={val.whatsapp_primary.number} onChange={(e) => setVal({ ...val, whatsapp_primary: { ...val.whatsapp_primary, number: e.target.value } })} />
          </div>
          <div className="space-y-2"><Label>Secondary name</Label>
            <Input value={val.whatsapp_secondary.label} onChange={(e) => setVal({ ...val, whatsapp_secondary: { ...val.whatsapp_secondary, label: e.target.value } })} />
          </div>
          <div className="space-y-2"><Label>Secondary number</Label>
            <Input value={val.whatsapp_secondary.number} onChange={(e) => setVal({ ...val, whatsapp_secondary: { ...val.whatsapp_secondary, number: e.target.value } })} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Mail className="size-4" /> Other Contact</h2>
        <div className="space-y-2"><Label>Email</Label>
          <Input type="email" value={val.email} onChange={(e) => setVal({ ...val, email: e.target.value })} />
        </div>
        <div className="space-y-2"><Label>Location</Label>
          <Input value={val.location} onChange={(e) => setVal({ ...val, location: e.target.value })} />
        </div>
      </Card>

      <Button size="lg" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
      </Button>
    </div>
  );
};

export default ContactSettings;

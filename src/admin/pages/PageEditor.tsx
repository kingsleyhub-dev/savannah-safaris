import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { requireAdmin } from "../lib/requireAdmin";
import { CONTENT_MANAGER_ROLES } from "@/admin/auth/permissions";
import { ImageField } from "../components/ImageField";

interface Section { id: string; slug: string; title: string; sort_order: number; }
interface Field {
  id: string; key: string; label: string; field_type: string;
  draft_value: string | null; published_value: string | null; sort_order: number;
}

const PageEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pageTitle, setPageTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [fieldsBySection, setFieldsBySection] = useState<Record<string, Field[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: page } = await supabase.from("pages").select("*").eq("slug", slug).single();
      if (!page) { setLoading(false); return; }
      setPageTitle(page.title);

      const { data: secs } = await supabase.from("sections").select("*").eq("page_id", page.id).order("sort_order");
      setSections((secs as Section[]) ?? []);

      const sectionIds = (secs ?? []).map((s) => s.id);
      if (sectionIds.length) {
        const { data: fs } = await supabase.from("content_fields").select("*").in("section_id", sectionIds).order("sort_order");
        const grouped: Record<string, Field[]> = {};
        const initialDrafts: Record<string, string> = {};
        (fs as (Field & { section_id: string })[] ?? []).forEach((f) => {
          (grouped[f.section_id] ||= []).push(f);
          initialDrafts[f.id] = f.draft_value ?? "";
        });
        setFieldsBySection(grouped);
        setDrafts(initialDrafts);
      }
      setLoading(false);
    })();
  }, [slug]);

  const saveDraft = async (field: Field) => {
    setSavingId(field.id);
    try {
      await requireAdmin(CONTENT_MANAGER_ROLES);
      const { error } = await supabase.from("content_fields")
        .update({ draft_value: drafts[field.id] })
        .eq("id", field.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Draft saved");
      await logAudit("save_draft", "content_field", field.id, { key: field.key });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
    } finally {
      setSavingId(null);
    }
  };

  const publish = async (field: Field) => {
    setSavingId(field.id);
    try {
      await requireAdmin(CONTENT_MANAGER_ROLES);
      const value = drafts[field.id];
      const { error } = await supabase.from("content_fields")
        .update({ draft_value: value, published_value: value, published_at: new Date().toISOString() })
        .eq("id", field.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Published live");
      await logAudit("publish", "content_field", field.id, { key: field.key });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const previewUrl = slug === "home" ? "/" : `/${slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <Link to="/admin/dashboard/pages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-3.5" /> All pages
          </Link>
          <h1 className="font-display text-3xl font-bold">{pageTitle}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={previewUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" /> Preview
          </a>
        </Button>
      </div>

      {sections.map((sec) => (
        <Card key={sec.id} className="p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold">{sec.title}</h2>
            <p className="text-xs text-muted-foreground font-mono">{sec.slug}</p>
          </div>

          <div className="space-y-5">
            {(fieldsBySection[sec.id] ?? []).map((f) => {
              const dirty = (drafts[f.id] ?? "") !== (f.draft_value ?? "");
              const unpublished = (f.draft_value ?? "") !== (f.published_value ?? "");
              return (
                <div key={f.id} className="space-y-2 pb-5 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="font-medium">{f.label}</Label>
                    <div className="flex gap-1">
                      {dirty && <Badge variant="secondary">Unsaved</Badge>}
                      {!dirty && unpublished && <Badge variant="outline">Draft</Badge>}
                    </div>
                  </div>
                  {f.field_type === "textarea" || f.field_type === "richtext" ? (
                    <Textarea rows={3} value={drafts[f.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [f.id]: e.target.value })} />
                  ) : f.field_type === "image" ? (
                    <ImageField
                      value={drafts[f.id] ?? ""}
                      onChange={(url) => setDrafts({ ...drafts, [f.id]: url })}
                    />
                  ) : (
                    <Input value={drafts[f.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [f.id]: e.target.value })} />
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={!dirty || savingId === f.id} onClick={() => saveDraft(f)}>
                      {savingId === f.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save draft
                    </Button>
                    <Button size="sm" disabled={savingId === f.id} onClick={() => publish(f)}>
                      <Send className="size-3.5" /> Publish
                    </Button>
                  </div>
                </div>
              );
            })}
            {!fieldsBySection[sec.id]?.length && <p className="text-sm text-muted-foreground italic">No editable fields in this section.</p>}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PageEditor;

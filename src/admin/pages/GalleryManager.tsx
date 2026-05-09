import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { galleryDefaults } from "@/data/galleryDefaults";
import { requireAdmin } from "../lib/requireAdmin";
import { MEDIA_MANAGER_ROLES } from "@/admin/auth/permissions";
import { logAudit } from "../lib/audit";

type Field = { id: string; key: string; published_value: string | null; draft_value: string | null };
type CustomMedia = {
  id: string;
  public_url: string;
  filename: string;
  alt_text: string | null;
  gallery_category: string | null;
  show_in_gallery: boolean;
  is_published: boolean;
  kind: "image" | "video";
};

const PHOTO_CATEGORIES = ["Living Room", "Dining Area", "Kitchen", "Bedrooms", "Bathrooms", "Views", "Exterior"];

const GalleryManager = () => {
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: section } = await supabase
      .from("sections")
      .select("id, page_id, pages!inner(slug)")
      .eq("slug", "grid")
      .eq("pages.slug", "gallery")
      .maybeSingle();
    if (!section) { setLoading(false); return; }
    setSectionId(section.id);

    const { data: rows } = await supabase
      .from("content_fields")
      .select("id, key, published_value, draft_value")
      .eq("section_id", section.id);
    const map: Record<string, Field> = {};
    (rows ?? []).forEach((r: any) => { map[r.key] = r; });
    setFields(map);

    const { data: media } = await supabase
      .from("media_assets")
      .select("id, public_url, filename, alt_text, gallery_category, show_in_gallery, is_published, kind")
      .order("created_at", { ascending: false });
    setCustom(((media ?? []) as CustomMedia[]).filter((m) => m.kind === "image"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upsertField = async (key: string, label: string, value: string) => {
    if (!sectionId) return;
    try { await requireAdmin(MEDIA_MANAGER_ROLES); } catch (e: any) { toast.error(e?.message ?? "Permission denied"); return; }
    const existing = fields[key];
    if (existing) {
      const { error } = await supabase
        .from("content_fields")
        .update({ published_value: value, draft_value: value, published_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
      setFields((cur) => ({ ...cur, [key]: { ...existing, published_value: value, draft_value: value } }));
    } else {
      const { data, error } = await supabase
        .from("content_fields")
        .insert({ section_id: sectionId, key, label, field_type: "text", published_value: value, draft_value: value, published_at: new Date().toISOString() })
        .select("id, key, published_value, draft_value")
        .single();
      if (error) return toast.error(error.message);
      setFields((cur) => ({ ...cur, [key]: data as Field }));
    }
    void logAudit("update_gallery_tile", "content_field", key, { value: value.slice(0, 200) });
  };

  const handleReplace = async (idx: number, file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be under 10MB");
    const key = `image${idx + 1}`;
    setBusyKey(key);
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
      const ext = file.name.split(".").pop();
      const path = `images/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      void supabase.from("media_assets").insert({
        storage_path: path, public_url: publicUrl, kind: "image",
        filename: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
      });
      await upsertField(key, `Tile ${idx + 1} image`, publicUrl);
      toast.success("Image replaced");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusyKey(null); }
  };

  const resetTile = async (idx: number) => {
    const key = `image${idx + 1}`;
    if (!fields[key] && !fields[`${key}.hidden`] && !fields[`${key}.alt`]) return;
    await Promise.all([
      fields[key] && supabase.from("content_fields").delete().eq("id", fields[key].id),
      fields[`${key}.hidden`] && supabase.from("content_fields").delete().eq("id", fields[`${key}.hidden`].id),
      fields[`${key}.alt`] && supabase.from("content_fields").delete().eq("id", fields[`${key}.alt`].id),
    ]);
    toast.success("Reset to default");
    load();
  };

  const toggleHidden = async (idx: number, hidden: boolean) => {
    await upsertField(`image${idx + 1}.hidden`, `Tile ${idx + 1} hidden`, hidden ? "true" : "false");
  };

  const updateAlt = async (idx: number, alt: string) => {
    await upsertField(`image${idx + 1}.alt`, `Tile ${idx + 1} alt text`, alt);
  };

  const uploadNewCustom = async (file: File, category: string = "Living Room") => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be under 10MB");
    setBusyKey(`__new__${category}`);
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
      const ext = file.name.split(".").pop();
      const path = `images/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbErr } = await supabase.from("media_assets").insert({
        storage_path: path, public_url: publicUrl, kind: "image",
        filename: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
        show_in_gallery: true, is_published: true, published_at: new Date().toISOString(), gallery_category: category,
      });
      if (dbErr) throw dbErr;
      toast.success(`Image added to ${category}`);
      void logAudit("add_gallery_image", "media_asset", undefined, { category, filename: file.name });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusyKey(null); }
  };

  const updateCustom = async (id: string, changes: Partial<CustomMedia>) => {
    const { error } = await (supabase.from("media_assets") as any).update({
      ...changes,
      published_at: changes.is_published ? new Date().toISOString() : undefined,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    setCustom((cur) => cur.map((c) => c.id === id ? { ...c, ...changes } : c));
  };

  const deleteCustom = async (m: CustomMedia) => {
    if (!confirm(`Delete ${m.filename}? This permanently removes it from the gallery.`)) return;
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
      const { error } = await supabase.from("media_assets").delete().eq("id", m.id);
      if (error) throw error;
      void logAudit("delete_gallery_image", "media_asset", m.id, { filename: m.filename });
      toast.success("Deleted");
      setCustom((cur) => cur.filter((c) => c.id !== m.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const tiles = useMemo(() => galleryDefaults.map((d, i) => {
    const key = `image${i + 1}`;
    const override = fields[key]?.published_value ?? "";
    const hidden = fields[`${key}.hidden`]?.published_value === "true";
    const alt = fields[`${key}.alt`]?.published_value ?? d.alt;
    return { idx: i, default: d, override, hidden, alt };
  }), [fields]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Gallery Manager</h1>
        <p className="text-muted-foreground mt-1">Replace, hide, or edit any image on the public gallery — including the bundled defaults.</p>
      </div>

      {PHOTO_CATEGORIES.map((cat) => {
        const sectionTiles = tiles.filter((t) => t.default.cat === cat);
        const sectionCustom = custom.filter((m) => (m.gallery_category ?? "") === cat);
        const busyAdd = busyKey === `__new__${cat}`;
        return (
          <section key={cat} className="space-y-4 border-t pt-6 first:border-0 first:pt-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{cat}</h2>
                <p className="text-xs text-muted-foreground">{sectionTiles.length} default • {sectionCustom.length} added</p>
              </div>
              <label>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadNewCustom(e.target.files[0], cat)} />
                <Button asChild size="sm" disabled={busyAdd}>
                  <span>{busyAdd ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Add to {cat}</span>
                </Button>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sectionTiles.map((t) => {
                const displayUrl = t.override || t.default.src;
                const key = `image${t.idx + 1}`;
                return (
                  <Card key={key} className={`overflow-hidden ${t.hidden ? "opacity-50" : ""}`}>
                    <div className="relative aspect-[4/3] bg-muted">
                      <img src={displayUrl} alt={t.alt} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute top-2 left-2 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] uppercase tracking-wide text-primary-foreground">Default</span>
                      {t.override && <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Custom</span>}
                      {t.hidden && <span className="absolute bottom-2 left-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">Hidden</span>}
                    </div>
                    <div className="p-3 space-y-3">
                      <Input value={t.alt} onChange={(e) => setFields((cur) => ({ ...cur, [`${key}.alt`]: { ...(cur[`${key}.alt`] ?? { id: "", key: `${key}.alt`, draft_value: null, published_value: null }), published_value: e.target.value } }))} onBlur={(e) => updateAlt(t.idx, e.target.value)} placeholder="Alt text" className="text-xs" />
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`${key}-hidden`} className="text-xs">Remove from site</Label>
                        <Switch id={`${key}-hidden`} checked={t.hidden} onCheckedChange={(v) => toggleHidden(t.idx, v)} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex">
                          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleReplace(t.idx, e.target.files[0])} />
                          <Button asChild size="sm" variant="outline" disabled={busyKey === key}>
                            <span>{busyKey === key ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Replace</span>
                          </Button>
                        </label>
                        {(t.override || t.hidden) && (
                          <Button size="sm" variant="ghost" onClick={() => resetTile(t.idx)}><RefreshCw className="size-3.5" /> Reset</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {sectionCustom.map((m) => (
                <Card key={m.id} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-muted">
                    <img src={m.public_url} alt={m.alt_text ?? m.filename} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Added</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium truncate">{m.filename}</p>
                    <Input defaultValue={m.alt_text ?? ""} onBlur={(e) => updateCustom(m.id, { alt_text: e.target.value })} placeholder="Alt text" className="text-xs" />
                    <select value={m.gallery_category ?? ""} onChange={(e) => updateCustom(m.id, { gallery_category: e.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                      <option value="">Move to section…</option>
                      {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex items-center justify-between"><Label className="text-xs">Show in Gallery</Label><Switch checked={m.show_in_gallery} onCheckedChange={(v) => updateCustom(m.id, { show_in_gallery: v, is_published: v ? m.is_published : false })} /></div>
                    <div className="flex items-center justify-between"><Label className="text-xs">Published</Label><Switch checked={m.is_published} disabled={!m.show_in_gallery} onCheckedChange={(v) => updateCustom(m.id, { is_published: v })} /></div>
                    <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => deleteCustom(m)}><Trash2 className="size-3.5" /> Remove</Button>
                  </div>
                </Card>
              ))}

              {sectionTiles.length === 0 && sectionCustom.length === 0 && (
                <Card className="p-8 text-center text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">No images in {cat} yet — click "Add to {cat}" above.</Card>
              )}
            </div>
          </section>
        );
      })}

      {(() => {
        const uncategorized = custom.filter((m) => !m.gallery_category || !PHOTO_CATEGORIES.includes(m.gallery_category));
        if (uncategorized.length === 0) return null;
        return (
          <section className="space-y-4 border-t pt-6">
            <h2 className="font-display text-xl font-semibold">Uncategorized ({uncategorized.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map((m) => (
                <Card key={m.id} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted"><img src={m.public_url} alt={m.alt_text ?? m.filename} className="w-full h-full object-cover" loading="lazy" /></div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium truncate">{m.filename}</p>
                    <select value={m.gallery_category ?? ""} onChange={(e) => updateCustom(m.id, { gallery_category: e.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                      <option value="">Choose section…</option>
                      {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => deleteCustom(m)}><Trash2 className="size-3.5" /> Remove</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })()}

export default GalleryManager;

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Loader2, Image as ImageIcon, Video, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { requireAdmin } from "../lib/requireAdmin";
import { MEDIA_MANAGER_ROLES } from "@/admin/auth/permissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const photoCategories = ["Bedrooms", "Living Room", "Dining Area", "Kitchen", "Bathrooms", "Views", "Exterior"];

interface Asset {
  id: string; storage_path: string; public_url: string;
  kind: "image" | "video"; filename: string; size_bytes: number | null; alt_text: string | null;
  created_at: string; show_in_gallery?: boolean; is_published?: boolean; published_at?: string | null; gallery_category?: string | null;
}

const MediaLibrary = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
    setAssets((data as Asset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /**
   * Fire-and-forget parallel uploads.
   * - Files upload concurrently (Promise.all) so 5 small images don't queue serially.
   * - The grid refreshes once all uploads settle, but the input is freed instantly
   *   so the admin can keep browsing without UI lag.
   */
  const handleUpload = async (files: FileList) => {
    const list = Array.from(files);
    if (inputRef.current) inputRef.current.value = "";
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
      return;
    }
    setUploading(true);
    toast.info(`Uploading ${list.length} file${list.length === 1 ? "" : "s"}…`);

    const userPromise = supabase.auth.getUser();

    const tasks = list.map(async (file) => {
      if (file.size > 50 * 1024 * 1024) { toast.error(`${file.name}: max 50MB`); return; }
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) { toast.error(`${file.name}: unsupported type`); return; }

      const folder = isVideo ? "videos" : "images";
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (upErr) { toast.error(`${file.name}: ${upErr.message}`); return; }

      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      const { data: { user } } = await userPromise;

      const kind: Asset["kind"] = isVideo ? "video" : "image";
      return {
        storage_path: path, public_url: publicUrl, kind,
        filename: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
      };
    });

    Promise.allSettled(tasks).then(async (results) => {
      const uploaded = results.flatMap((result) => (
        result.status === "fulfilled" && result.value ? [result.value] : []
      ));

      if (uploaded.length > 0) {
        const { error: dbErr } = await supabase.from("media_assets").insert(uploaded);
        if (dbErr) {
          toast.error(dbErr.message);
        } else {
          uploaded.forEach((item) => void logAudit("upload_media", "media_asset", item.storage_path, { filename: item.filename }));
        }
      }

      setUploading(false);
      toast.success(uploaded.length > 0 ? "Upload complete" : "No files uploaded");
      load();
    });
  };

  const remove = async (asset: Asset) => {
    if (!confirm(`Delete ${asset.filename}? This cannot be undone.`)) return;
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
      return;
    }
    await supabase.storage.from("media").remove([asset.storage_path]);
    await supabase.from("media_assets").delete().eq("id", asset.id);
    await logAudit("delete_media", "media_asset", asset.id, { filename: asset.filename });
    toast.success("Deleted");
    load();
  };

  const copyUrl = async (asset: Asset) => {
    await navigator.clipboard.writeText(asset.public_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const updateGalleryState = async (asset: Asset, changes: Partial<Pick<Asset, "show_in_gallery" | "is_published" | "gallery_category">>) => {
    try {
      await requireAdmin(MEDIA_MANAGER_ROLES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission denied");
      return;
    }
    const nextPublished = changes.is_published ?? asset.is_published ?? false;
    const { error } = await (supabase.from("media_assets") as any).update({
      ...changes,
      published_at: changes.is_published ? new Date().toISOString() : nextPublished ? asset.published_at : null,
    }).eq("id", asset.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("update_media_publish_state", "media_asset", asset.id, { filename: asset.filename, ...changes });
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...changes, published_at: changes.is_published ? new Date().toISOString() : item.published_at } : item));
  };

  const filtered = assets.filter((a) => a.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground mt-1">Upload, organise, and reuse images and videos across the site.</p>
        </div>
        <div>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" hidden
            onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
          </Button>
        </div>
      </div>

      <Input placeholder="Search by filename…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No media yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click Upload to add your first image or video.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                {a.kind === "image" ? (
                  <img src={a.public_url} alt={a.alt_text ?? a.filename} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-foreground/5">
                    <Video className="size-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-2">
                <p className="text-xs font-medium truncate" title={a.filename}>{a.filename}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => copyUrl(a)}>
                    {copiedId === a.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => remove(a)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <div className="space-y-2 rounded-md bg-secondary/60 p-2">
                  {a.kind === "image" && (
                    <select
                      value={a.gallery_category ?? ""}
                      onChange={(event) => updateGalleryState(a, { gallery_category: event.target.value || null })}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      aria-label="Photo section"
                    >
                      <option value="">Photo section</option>
                      {photoCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`gallery-${a.id}`} className="text-xs">Gallery</Label>
                    <Switch id={`gallery-${a.id}`} checked={!!a.show_in_gallery} onCheckedChange={(checked) => updateGalleryState(a, { show_in_gallery: checked, is_published: checked ? a.is_published : false })} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`publish-${a.id}`} className="text-xs">Published</Label>
                    <Switch id={`publish-${a.id}`} checked={!!a.is_published} disabled={!a.show_in_gallery} onCheckedChange={(checked) => updateGalleryState(a, { is_published: checked })} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;

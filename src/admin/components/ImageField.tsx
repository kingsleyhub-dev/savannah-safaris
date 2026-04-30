import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "../lib/audit";
import { requireAdmin } from "../lib/requireAdmin";
import { MEDIA_MANAGER_ROLES } from "@/admin/auth/permissions";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export const ImageField = ({ value, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Local blob preview shown immediately while the real file uploads in the background.
  const [preview, setPreview] = useState<string | null>(null);

  // Revoke any blob URL we created to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    // 1. Show an instant local preview so the UI never feels stuck.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    if (inputRef.current) inputRef.current.value = "";

    // 2. Run the actual upload in the background (no await on the caller).
    void (async () => {
      try {
        await requireAdmin(MEDIA_MANAGER_ROLES);
      } catch (err) {
        setUploading(false);
        setPreview(null);
        toast.error(err instanceof Error ? err.message : "Permission denied");
        return;
      }
      const ext = file.name.split(".").pop();
      const path = `images/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (upErr) {
        setUploading(false);
        setPreview(null);
        toast.error(upErr.message);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      // Fire-and-forget DB metadata + audit so they don't block the UI swap.
      supabase.from("media_assets").insert({
        storage_path: path,
        public_url: publicUrl,
        kind: "image",
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user?.id,
      }).then(() => logAudit("upload_media", "media_asset", path, { filename: file.name }));

      onChange(publicUrl);
      setUploading(false);
      setPreview(null);
      toast.success("Image uploaded");
    })();
  };

  const displayUrl = preview ?? value;

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full max-w-md rounded-xl overflow-hidden border border-border bg-muted">
        {displayUrl ? (
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
        {uploading && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-full bg-foreground/70 px-3 py-1.5 text-xs text-primary-foreground backdrop-blur-sm">
            <Loader2 className="size-3.5 animate-spin" /> Uploading…
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" /> {value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange("")}
            disabled={uploading}
          >
            <X className="size-3.5" /> Remove
          </Button>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL"
        className="text-xs font-mono"
      />
    </div>
  );
};
import { PageHero } from "@/components/sections/PageHero";
import { images } from "@/data/site";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSiteContent, resolveImage } from "@/hooks/useSiteContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LazyVideo } from "@/components/media/LazyVideo";
import { ResponsiveImage } from "@/components/media/ResponsiveImage";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { videos } from "@/assets/registry";
import { galleryDefaults, type GalleryDefault } from "@/data/galleryDefaults";

type Item = GalleryDefault;
type MediaAsset = { id: string; public_url: string; kind: "image" | "video"; filename: string; alt_text: string | null; gallery_category: string | null };

const baseCats = ["All", ...Array.from(new Set(galleryDefaults.map((i) => i.cat)))];
const GRID_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

const Gallery = () => {
  const { get } = useSiteContent();
  const h = (k: string, fb: string) => get("gallery", "hero", k, fb);
  // Each default tile can be replaced (`gallery.grid.image{n}`) or hidden
  // (`gallery.grid.image{n}.hidden = "true"`) by the admin.
  const all: Item[] = galleryDefaults.flatMap((d, i) => {
    if (get("gallery", "grid", `image${i + 1}.hidden`, "") === "true") return [];
    const override = resolveImage(get("gallery", "grid", `image${i + 1}`, ""), "");
    const altOverride = get("gallery", "grid", `image${i + 1}.alt`, "");
    return [override
      ? { ...d, src: override, alt: altOverride || d.alt, asset: undefined }
      : { ...d, alt: altOverride || d.alt }];
  });
  const [active, setActive] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [publishedMedia, setPublishedMedia] = useState<MediaAsset[]>([]);
  const publishedPhotos = publishedMedia.filter((item) => item.kind === "image");
  const publishedVideos = publishedMedia.filter((item) => item.kind === "video");
  const cats = ["All", ...Array.from(new Set([...baseCats.slice(1), ...publishedPhotos.map((item) => item.gallery_category).filter(Boolean) as string[]]))];
  const photoItems: Item[] = useMemo(
    () => [
      ...all,
      ...publishedPhotos.map((item) => ({ src: item.public_url, cat: item.gallery_category ?? "Uploaded", alt: item.alt_text ?? item.filename })),
    ],
    [all, publishedPhotos],
  );
  const filtered = active === "All" ? photoItems : photoItems.filter((i) => i.cat === active);

  useEffect(() => {
    (supabase.from("media_assets") as any).select("id, public_url, kind, filename, alt_text, gallery_category").eq("show_in_gallery", true).eq("is_published", true).order("gallery_sort_order", { ascending: true }).order("created_at", { ascending: false }).then(({ data }: { data: MediaAsset[] | null }) => {
      setPublishedMedia((data as MediaAsset[]) ?? []);
    });
  }, []);

  // Sync the lightbox carousel to the clicked tile.
  useEffect(() => {
    if (api && openIndex != null) api.scrollTo(openIndex, true);
  }, [api, openIndex]);

  // Keyboard nav within the lightbox.
  useEffect(() => {
    if (openIndex == null || !api) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") api.scrollNext();
      if (e.key === "ArrowLeft") api.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, api]);

  return (
    <>
      <PageHero
        eyebrow={h("eyebrow", "Gallery")}
        title={h("title", "Inside a Nairobi sanctuary")}
        subtitle={h("subtitle", "Soft light, refined details, and city views from every angle.")}
        image={resolveImage(h("image", ""), images.hero)}
      />

      <section className="section-padding">
        <div className="container-luxe">
          <Tabs defaultValue="photos" className="space-y-10">
            <TabsList className="mx-auto flex w-fit">
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="space-y-10">
              <div className="flex flex-wrap gap-2 justify-center">
                {cats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActive(c)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-smooth ${
                      active === c ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80 hover:bg-secondary/70"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {filtered.map((img, i) => {
                  // Living/dining/kitchen tiles live in the first 8 slots of the
                  // default order — give them eager priority loading.
                  const isPriority = i < 8;
                  return (
                    <button
                      key={`${img.src}-${i}`}
                      onClick={() => setOpenIndex(i)}
                      className="block w-full overflow-hidden rounded-2xl group break-inside-avoid"
                    >
                      {img.asset ? (
                        <ResponsiveImage
                          asset={img.asset}
                          alt={img.alt}
                          sizes={GRID_SIZES}
                          loading={isPriority ? "eager" : "lazy"}
                          fetchPriority={isPriority ? "high" : "auto"}
                          className="w-full transition-elegant group-hover:scale-105"
                        />
                      ) : (
                        <img
                          src={img.src}
                          alt={img.alt}
                          loading={isPriority ? "eager" : "lazy"}
                          decoding="async"
                          className="w-full transition-elegant group-hover:scale-105"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="videos">
              {publishedVideos.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">No published videos yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publishedVideos.map((video) => (
                    <div key={video.id} className="aspect-video">
                      <LazyVideo
                        src={video.public_url}
                        poster={videos.galleryIntro.posterBase ? { base: videos.galleryIntro.posterBase, alt: video.alt_text ?? videos.galleryIntro.posterAlt } : "/assets/gallery/videos/intro-poster.jpg"}
                        ariaLabel={`Play ${video.filename}`}
                        className="aspect-video"
                        videoClassName="rounded-2xl"
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Swipe-enabled lightbox — drag/swipe on touch, arrow keys on desktop. */}
      <Dialog open={openIndex !== null} onOpenChange={(v) => !v && setOpenIndex(null)}>
        <DialogContent className="max-w-6xl p-0 bg-transparent border-0 shadow-none">
          {openIndex !== null && (
            <Carousel
              setApi={setApi}
              opts={{ loop: true, startIndex: openIndex, dragFree: false }}
              className="w-full"
            >
              <CarouselContent>
                {filtered.map((img, i) => (
                  <CarouselItem key={`${img.src}-light-${i}`} className="flex items-center justify-center">
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="max-h-[85vh] w-auto rounded-2xl object-contain mx-auto"
                      draggable={false}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 sm:-left-12" />
              <CarouselNext className="right-2 sm:-right-12" />
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Gallery;

import { PageHero } from "@/components/sections/PageHero";
import { images } from "@/data/site";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSiteContent, resolveImage } from "@/hooks/useSiteContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type Item = { src: string; cat: string; alt: string };
type MediaAsset = { id: string; public_url: string; kind: "image" | "video"; filename: string; alt_text: string | null; gallery_category: string | null };
type MediaMetric = { width: number; height: number; label: string };
const debugGridClass = "bg-[linear-gradient(to_right,hsl(var(--primary)/0.18)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.18)_1px,transparent_1px)] bg-[size:24px_24px]";
const allDefaults: Item[] = [
  { src: images.bedroom, cat: "Bedrooms", alt: "Master bedroom" },
  { src: images.bedroom2, cat: "Bedrooms", alt: "Second bedroom" },
  { src: images.bedroom2Alt1, cat: "Bedrooms", alt: "Second bedroom — wide view" },
  { src: images.bedroom2Alt2, cat: "Bedrooms", alt: "Second bedroom — headboard detail" },
  { src: images.living, cat: "Living Room", alt: "Sitting lounge" },
  { src: images.living2, cat: "Living Room", alt: "Lounge — wide view" },
  { src: images.dining, cat: "Dining Area", alt: "Dining" },
  { src: images.dining2, cat: "Dining Area", alt: "Dining — chandelier view" },
  { src: images.dining3, cat: "Dining Area", alt: "Dining — side view" },
  { src: images.kitchen, cat: "Kitchen", alt: "Kitchen" },
  { src: images.kitchen2, cat: "Kitchen", alt: "Kitchen — counter view" },
  { src: images.kitchen3, cat: "Kitchen", alt: "Kitchen — wide view" },
  { src: images.bathroom, cat: "Bathrooms", alt: "Master bathroom" },
  { src: images.bathroomAlt1, cat: "Bathrooms", alt: "Second bathroom" },
  { src: images.bathroomAlt2, cat: "Bathrooms", alt: "Bathroom — vanity detail" },
  { src: images.view, cat: "Views", alt: "City view" },
  { src: images.hero, cat: "Exterior", alt: "Balcony" },
  { src: images.bedroomAlt1, cat: "Bedrooms", alt: "Bedroom — wider view" },
  { src: images.bedroomAlt2, cat: "Bedrooms", alt: "Bedroom — detail" },
];
const baseCats = ["All", ...Array.from(new Set(allDefaults.map((i) => i.cat)))];

const Gallery = () => {
  const { get } = useSiteContent();
  const h = (k: string, fb: string) => get("gallery", "hero", k, fb);
  const all: Item[] = allDefaults.map((d, i) => ({
    ...d,
    src: resolveImage(get("gallery", "grid", `image${i + 1}`, ""), d.src),
  }));
  const [active, setActive] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [publishedMedia, setPublishedMedia] = useState<MediaAsset[]>([]);
  const photoRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [photoMetrics, setPhotoMetrics] = useState<Record<number, MediaMetric>>({});
  const [videoMetrics, setVideoMetrics] = useState<Record<number, MediaMetric>>({});
  const [debugLayout, setDebugLayout] = useState(false);
  const publishedPhotos = publishedMedia.filter((item) => item.kind === "image");
  const publishedVideos = publishedMedia.filter((item) => item.kind === "video");
  const cats = ["All", ...Array.from(new Set([...baseCats.slice(1), ...publishedPhotos.map((item) => item.gallery_category).filter(Boolean) as string[]]))];
  const photoItems = [
    ...all,
    ...publishedPhotos.map((item) => ({ src: item.public_url, cat: item.gallery_category ?? "Uploaded", alt: item.alt_text ?? item.filename })),
  ];
  const filtered = active === "All" ? photoItems : photoItems.filter((i) => i.cat === active);

  useEffect(() => {
    (supabase.from("media_assets") as any).select("id, public_url, kind, filename, alt_text, gallery_category").eq("show_in_gallery", true).eq("is_published", true).order("gallery_sort_order", { ascending: true }).order("created_at", { ascending: false }).then(({ data }: { data: MediaAsset[] | null }) => {
      setPublishedMedia((data as MediaAsset[]) ?? []);
    });
  }, []);

  useEffect(() => {
    const updateMetrics = () => {
      const nextPhotoMetrics = photoRefs.current.reduce<Record<number, MediaMetric>>((acc, tile, index) => {
        if (!tile) return acc;
        const rect = tile.getBoundingClientRect();
        acc[index] = { width: Math.round(rect.width), height: Math.round(rect.height), label: filtered[index]?.cat ?? "Photo" };
        return acc;
      }, {});
      const nextVideoMetrics = videoRefs.current.reduce<Record<number, MediaMetric>>((acc, tile, index) => {
        if (!tile) return acc;
        const rect = tile.getBoundingClientRect();
        acc[index] = { width: Math.round(rect.width), height: Math.round(rect.height), label: "Video" };
        return acc;
      }, {});
      setPhotoMetrics(nextPhotoMetrics);
      setVideoMetrics(nextVideoMetrics);
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [filtered, publishedVideos]);

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

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setDebugLayout((value) => !value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-smooth ring-1 ring-border ${
                  debugLayout ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
                aria-pressed={debugLayout}
              >
                Debug layout
              </button>
            </div>

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

              <div className={`columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 ${debugLayout ? `rounded-2xl p-2 ${debugGridClass}` : ""}`}>
                {filtered.map((img, i) => (
                  <button
                    key={`${img.src}-${i}`}
                    ref={(node) => {
                      photoRefs.current[i] = node;
                    }}
                    onClick={() => setOpenIndex(i)}
                    className={`relative block w-full overflow-hidden rounded-2xl group break-inside-avoid ${debugLayout ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  >
                    {(debugLayout || photoMetrics[i]) && photoMetrics[i] && (
                      <div className={`absolute left-3 top-3 z-10 rounded-md px-2 py-1 font-mono text-[11px] leading-tight shadow-lg ring-1 backdrop-blur-sm ${debugLayout ? "bg-primary text-primary-foreground ring-primary" : "bg-background/90 text-foreground ring-border sm:hidden"}`}>
                        <div>{photoMetrics[i].width}×{photoMetrics[i].height}</div>
                        <div>{photoMetrics[i].label}</div>
                      </div>
                    )}
                    <img src={img.src} alt={img.alt} loading="lazy" className="w-full transition-elegant group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="videos" className={debugLayout ? `rounded-2xl p-2 ${debugGridClass}` : ""}>
              {publishedVideos.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">No published videos yet.</p>
              ) : (
                <Carousel opts={{ align: "start" }} className="mx-auto max-w-5xl">
                  <CarouselContent>
                  {publishedVideos.map((video, index) => (
                    <CarouselItem key={video.id} className="sm:basis-1/2 lg:basis-1/3">
                      <div
                        ref={(node) => {
                          videoRefs.current[index] = node;
                        }}
                        className={`relative rounded-2xl ${debugLayout ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                      >
                        {(debugLayout || videoMetrics[index]) && videoMetrics[index] && (
                          <div className={`absolute left-3 top-3 z-10 rounded-md px-2 py-1 font-mono text-[11px] leading-tight shadow-lg ring-1 backdrop-blur-sm ${debugLayout ? "bg-primary text-primary-foreground ring-primary" : "bg-background/90 text-foreground ring-border sm:hidden"}`}>
                            <div>{videoMetrics[index].width}×{videoMetrics[index].height}</div>
                            <div>{videoMetrics[index].label}</div>
                          </div>
                        )}
                        <video src={video.public_url} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-secondary object-cover" />
                      </div>
                    </CarouselItem>
                  ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Dialog open={openIndex !== null} onOpenChange={() => setOpenIndex(null)}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-0 shadow-none">
          {openIndex !== null && (
            <Carousel opts={{ startIndex: openIndex, loop: true }} className="w-full">
              <CarouselContent>
                {filtered.map((img, i) => (
                  <CarouselItem key={`${img.src}-modal-${i}`}>
                    <img src={img.src} alt={img.alt} className="max-h-[85vh] w-full rounded-2xl object-contain" />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3" />
              <CarouselNext className="right-3" />
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Gallery;
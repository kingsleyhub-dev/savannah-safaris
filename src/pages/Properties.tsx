import { Link } from "react-router-dom";
import { PageHero } from "@/components/sections/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BedDouble, Bath, Users, MapPin, Loader2, PlayCircle } from "lucide-react";
import { useProperties, formatKES, type Property } from "@/hooks/useProperties";
import { images } from "@/data/site";

const PriceBlock = ({ p }: { p: Property }) => (
  <div className="space-y-1.5 rounded-xl bg-secondary/40 p-4">
    {p.supports_monthly && p.price_monthly_kes_cents && (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Monthly{p.supports_furnished_option ? " · Unfurnished" : ""}
        </span>
        <span className="font-display text-lg font-bold text-primary">
          {formatKES(p.price_monthly_kes_cents)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
        </span>
      </div>
    )}
    {p.supports_furnished_option && p.price_monthly_furnished_kes_cents && (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Monthly · Furnished</span>
        <span className="font-display text-lg font-bold text-primary">
          {formatKES(p.price_monthly_furnished_kes_cents)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
        </span>
      </div>
    )}
    {p.supports_nightly && p.price_nightly_kes_cents && (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Nightly stay</span>
        <span className="font-display text-lg font-bold text-primary">
          {formatKES(p.price_nightly_kes_cents)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/night</span>
        </span>
      </div>
    )}
  </div>
);

const PropertyCard = ({ p }: { p: Property }) => {
  const heroImg = p.hero_image_url ?? images.bedroom;
  const isVideo = !!p.hero_video_url;
  return (
    <Card className="group overflow-hidden shadow-elegant transition-elegant hover:shadow-2xl">
      <Link to={`/properties/${p.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-secondary">
        {isVideo ? (
          <>
            <video
              src={p.hero_video_url!}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 transition-colors group-hover:bg-black/40">
              <PlayCircle className="size-16 text-white/95 drop-shadow-lg" />
            </span>
          </>
        ) : (
          <img
            src={heroImg}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {p.block_label && (
          <Badge className="absolute left-4 top-4 bg-background/90 text-foreground hover:bg-background">
            {p.block_label}
          </Badge>
        )}
      </Link>
      <div className="space-y-4 p-6">
        <div>
          <h3 className="font-display text-2xl font-bold">{p.name}</h3>
          {p.tagline && <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><BedDouble className="size-4 text-primary" /> {p.bedrooms} bed</span>
          <span className="flex items-center gap-1.5"><Bath className="size-4 text-primary" /> {p.bathrooms} bath</span>
          <span className="flex items-center gap-1.5"><Users className="size-4 text-primary" /> {p.max_guests} guests</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" /> {p.location}</span>
        </div>
        <PriceBlock p={p} />
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/properties/${p.slug}`}>View details</Link>
          </Button>
          <Button asChild variant="hero" className="flex-1">
            <Link to={`/booking?property=${p.slug}`}>Book now <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

const Properties = () => {
  const { properties, loading } = useProperties();

  return (
    <>
      <PageHero
        eyebrow="Our Properties"
        title="Choose your stay"
        subtitle="Two distinctive residences in Kilimani — both delivering luxury, security, and seamless direct booking."
        image={images.living}
      />
      <section className="section-padding">
        <div className="container-luxe">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Properties;

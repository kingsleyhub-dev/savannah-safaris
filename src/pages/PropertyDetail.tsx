import { Link, useParams } from "react-router-dom";
import { PageHero } from "@/components/sections/PageHero";
import { Amenities } from "@/components/sections/Amenities";
import { CTA } from "@/components/sections/CTA";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BedDouble, Bath, Users, MapPin, Loader2, ShieldCheck, Wifi, Car } from "lucide-react";
import { LazyVideo } from "@/components/media/LazyVideo";
import { useProperty, formatKES } from "@/hooks/useProperties";
import { images } from "@/data/site";

const PropertyDetail = () => {
  const { slug } = useParams();
  const { property, loading } = useProperty(slug);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container-luxe pt-32 pb-16 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold">Property not found</h1>
        <Button asChild variant="hero"><Link to="/properties">Back to properties</Link></Button>
      </div>
    );
  }

  const isVideo = !!property.hero_video_url;
  const heroImage = property.hero_image_url ?? images.living;

  return (
    <>
      <PageHero
        eyebrow={property.block_label ?? "The Stay"}
        title={property.name}
        subtitle={property.tagline ?? undefined}
        image={heroImage}
      />

      <section className="section-padding">
        <div className="container-luxe grid gap-10 lg:grid-cols-3">
          {/* MAIN: video / image showcase + details */}
          <div className="lg:col-span-2 space-y-8">
            {isVideo ? (
              <div className="aspect-video overflow-hidden rounded-2xl shadow-elegant">
                <LazyVideo
                  src={property.hero_video_url!}
                  poster={heroImage}
                  ariaLabel={`Play tour of ${property.name}`}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl shadow-elegant">
                <img src={heroImage} alt={property.name} className="w-full aspect-[4/3] object-cover" />
              </div>
            )}

            <div className="space-y-4">
              <span className="eyebrow">— Overview</span>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">A residence designed for true comfort</h2>
              {property.description && (
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{property.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <BedDouble className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{property.bedrooms} {property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Bath className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{property.bathrooms} {property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <Users className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">Up to {property.max_guests}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <MapPin className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{property.location}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[{ Icon: Wifi, label: "Free High-Speed Wi-Fi" }, { Icon: Car, label: "Free Secure Parking" }, { Icon: ShieldCheck, label: "24/7 Security" }].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <Icon className="size-5 text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SIDEBAR: pricing + booking CTAs */}
          <aside className="self-start lg:sticky lg:top-28 space-y-4">
            <Card className="overflow-hidden shadow-elegant">
              <div className="space-y-5 p-6">
                {property.block_label && <Badge variant="outline">{property.block_label}</Badge>}
                <div>
                  <h3 className="font-display text-xl font-bold">{property.name}</h3>
                  <p className="text-sm text-muted-foreground">{property.location}</p>
                </div>

                <div className="space-y-3 border-y border-border py-4">
                  {property.supports_monthly && property.price_monthly_kes_cents && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Monthly{property.supports_furnished_option ? " · Unfurnished" : ""}
                      </span>
                      <span className="font-display text-lg font-bold text-primary">
                        {formatKES(property.price_monthly_kes_cents)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>
                  )}
                  {property.supports_furnished_option && property.price_monthly_furnished_kes_cents && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Monthly · Furnished</span>
                      <span className="font-display text-lg font-bold text-primary">
                        {formatKES(property.price_monthly_furnished_kes_cents)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>
                  )}
                  {property.supports_nightly && property.price_nightly_kes_cents && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Nightly stay</span>
                      <span className="font-display text-lg font-bold text-primary">
                        {formatKES(property.price_nightly_kes_cents)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/night</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Button asChild variant="hero" size="lg" className="w-full">
                    <Link to={`/booking?property=${property.slug}`}>
                      Book now <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link to={`/booking?property=${property.slug}&intent=reserve`}>Reserve now</Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="w-full">
                    <Link to="/contact">Inquire now</Link>
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">Secure checkout · Multiple payment options</p>
              </div>
            </Card>
          </aside>
        </div>
      </section>

      <Amenities />
      <CTA />
    </>
  );
};

export default PropertyDetail;

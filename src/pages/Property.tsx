import { PageHero } from "@/components/sections/PageHero";
import { Amenities } from "@/components/sections/Amenities";
import { CTA } from "@/components/sections/CTA";
import { images } from "@/data/site";
import { Users, Clock, Cigarette, Dog, PartyPopper, BedDouble } from "lucide-react";
import { useSiteContent, resolveImage } from "@/hooks/useSiteContent";

const roomDefaults = [
  { name: "Sitting Lounge", desc: "Velvet seating, smart TV, fast Wi-Fi — designed for slow evenings and easy conversation.", img: images.living },
  { name: "Dining Room", desc: "Round table for six under a sculptural pendant — designed for gathering.", img: images.dining },
  { name: "Modern Kitchen", desc: "Marble counters, full appliances, complimentary essentials and coffee.", img: images.kitchen },
  { name: "Master Bedroom", desc: "King bed, ensuite marble bathroom, blackout drapes, city-view window.", img: images.bedroom },
  { name: "Second Bedroom", desc: "Queen bed, ensuite shower, plush linens, soft natural light.", img: images.bedroom2 },
  { name: "Spa-like Bathrooms", desc: "Rainfall showers, gold fixtures, premium amenities — a quiet retreat at the end of every day.", img: images.spaBath },
];

const rules = [
  { icon: Clock, label: "Check-in 2:00 PM" },
  { icon: Clock, label: "Check-out 11:00 AM" },
  { icon: Users, label: "Max 4 guests" },
  { icon: Cigarette, label: "No smoking indoors" },
  { icon: PartyPopper, label: "No parties / events" },
  { icon: Dog, label: "Pets on request" },
];

const Property = () => {
  const { get } = useSiteContent();
  const h = (k: string, fb: string) => get("property", "hero", k, fb);
  const r = (k: string, fb: string) => get("property", "rooms", k, fb);
  const ru = (k: string, fb: string) => get("property", "rules", k, fb);
  const rooms = roomDefaults.map((d, i) => {
    const n = i + 1;
    return {
      name: r(`room${n}_name`, d.name),
      desc: r(`room${n}_desc`, d.desc),
      img: resolveImage(r(`room${n}_image`, ""), d.img),
    };
  });
  return (
  <>
    <PageHero
      eyebrow={h("eyebrow", "The Stay")}
      title={h("title", "A residence designed for true comfort")}
      subtitle={h("subtitle", "Every room considered, every detail intentional.")}
      image={resolveImage(h("image", ""), images.living)}
    />

    <section className="section-padding">
      <div className="container-luxe space-y-12 sm:space-y-16">
        {rooms.map((r, i) => (
          <div key={r.name} className={`grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div className="overflow-hidden rounded-2xl shadow-elegant">
              <img src={r.img} alt={r.name} loading="lazy" className="w-full aspect-[4/3] object-cover hover:scale-105 transition-elegant" />
            </div>
            <div className="space-y-4">
              <span className="eyebrow">— Room 0{i + 1}</span>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{r.name}</h2>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{r.desc}</p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <BedDouble className="size-4" /> Premium furnishings · Daily housekeeping available
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    <Amenities />

    <section className="section-padding bg-secondary/40">
      <div className="container-luxe max-w-4xl">
        <div className="text-center mb-12 space-y-3">
          <span className="eyebrow">{ru("eyebrow", "— House rules")}</span>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{ru("title", "A few simple guidelines")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 bg-card border border-border rounded-xl p-5">
              <Icon className="size-5 text-primary" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <CTA />
  </>
  );
};

export default Property;
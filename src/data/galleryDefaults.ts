// Shared default gallery tiles — used by both the public Gallery page and the
// admin Gallery Manager so admins can replace/hide every built-in image.
import { images } from "@/data/site";
import { gallery, type Asset } from "@/assets/registry";

export type GalleryDefault = { src: string; cat: string; alt: string; asset?: Asset };

export const galleryDefaults: GalleryDefault[] = [
  // Living
  { asset: gallery.living1, src: images.living, cat: "Living Room", alt: "Sitting lounge" },
  { asset: gallery.living2, src: images.living2, cat: "Living Room", alt: "Lounge — wide view" },
  // Dining
  { asset: gallery.dining1, src: images.dining, cat: "Dining Area", alt: "Dining" },
  { asset: gallery.dining2, src: images.dining2, cat: "Dining Area", alt: "Dining — chandelier view" },
  { asset: gallery.dining3, src: images.dining3, cat: "Dining Area", alt: "Dining — side view" },
  // Kitchen
  { asset: gallery.kitchen1, src: images.kitchen, cat: "Kitchen", alt: "Kitchen" },
  { asset: gallery.kitchen2, src: images.kitchen2, cat: "Kitchen", alt: "Kitchen — counter view" },
  { asset: gallery.kitchen3, src: images.kitchen3, cat: "Kitchen", alt: "Kitchen — wide view" },
  // Bedrooms
  { asset: gallery.bedroom1, src: images.bedroom, cat: "Bedrooms", alt: "Master bedroom" },
  { asset: gallery.bedroom1Alt1, src: images.bedroomAlt1, cat: "Bedrooms", alt: "Bedroom — wider view" },
  { asset: gallery.bedroom1Alt2, src: images.bedroomAlt2, cat: "Bedrooms", alt: "Bedroom — detail" },
  { asset: gallery.bedroom2, src: images.bedroom2, cat: "Bedrooms", alt: "Second bedroom" },
  { asset: gallery.bedroom2Alt1, src: images.bedroom2Alt1, cat: "Bedrooms", alt: "Second bedroom — wide view" },
  { asset: gallery.bedroom2Alt2, src: images.bedroom2Alt2, cat: "Bedrooms", alt: "Second bedroom — headboard detail" },
  // Bathrooms
  { asset: gallery.spaBath, src: images.spaBath, cat: "Bathrooms", alt: "Spa-like master bathroom with rainfall shower" },
  { asset: gallery.bathroom1, src: images.bathroomAlt1, cat: "Bathrooms", alt: "Master bathroom" },
  { asset: gallery.bathroom1Alt1, src: images.bathroomAlt2, cat: "Bathrooms", alt: "Second bathroom" },
  { asset: gallery.bathroom1Alt2, src: images.bathroomVanity, cat: "Bathrooms", alt: "Bathroom — vanity detail" },
  // Views / exterior
  { asset: gallery.cityView, src: images.view, cat: "Views", alt: "City view" },
  { src: images.hero, cat: "Exterior", alt: "Balcony" },
];

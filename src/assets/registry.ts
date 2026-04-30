/**
 * Asset registry — single source of truth for every bundled image/video.
 *
 * Why a registry?
 *   - Keeps file paths out of components so swapping an asset = editing one line.
 *   - Pairs cleanly with the page-based folder layout under `public/assets/`.
 *   - Cursor / Lovable can rename or replace files in one spot without grep-fests.
 *
 * Each `Asset` describes the *base* path (no extension, no width suffix).
 * <ResponsiveImage> derives `.avif`, `.webp`, fallback, and the 480/768/1280/1920w
 * srcset entries automatically when `responsive: true`.
 */

export type Asset = {
  /** Path under /public, no extension, no width suffix. e.g. "/assets/homepage/images/hero" */
  base: string;
  /** "jpg" or "png". PNG is used when the image has transparency. */
  fallbackExt: "jpg" | "png";
  /** Set true when sized variants (-480/-768/-1280/-1920) exist on disk. */
  responsive?: boolean;
  /** Human-readable default alt text. */
  alt: string;
};

const widths = [480, 768, 1280, 1920] as const;
export type ResponsiveWidth = (typeof widths)[number];
export const RESPONSIVE_WIDTHS = widths;

// ────────────── Homepage ──────────────
export const homepage = {
  hero: { base: "/assets/homepage/images/hero", fallbackExt: "jpg", responsive: true, alt: "Luxury Nairobi apartment with city view" },
} satisfies Record<string, Asset>;

// ────────────── Shared (logos, vehicles, icons) ──────────────
export const shared = {
  heroLogo: { base: "/assets/shared/logos/home-hero-logo", fallbackExt: "png", alt: "Savannah Safaris" },
  navLogo: { base: "/assets/shared/logos/logo", fallbackExt: "png", alt: "Savannah Safaris logo" },
  nissan: { base: "/assets/shared/vehicles/nissan", fallbackExt: "jpg", alt: "Joel's Nissan" },
} satisfies Record<string, Asset>;

// ────────────── Gallery (page-based, grouped by section) ──────────────
const galleryImg = (folder: string, name: string, alt: string): Asset => ({
  base: `/assets/gallery/images/${folder}/${name}`,
  fallbackExt: "jpg",
  responsive: true,
  alt,
});

export const gallery = {
  bedroom1: galleryImg("bedrooms", "bedroom-1", "Master bedroom"),
  bedroom1Alt1: galleryImg("bedrooms", "bedroom-1-alt1", "Bedroom — wider view"),
  bedroom1Alt2: galleryImg("bedrooms", "bedroom-1-alt2", "Bedroom — detail"),
  bedroom2: galleryImg("bedrooms", "bedroom-2", "Second bedroom"),
  bedroom2Alt1: galleryImg("bedrooms", "bedroom-2-alt1", "Second bedroom — wide view"),
  bedroom2Alt2: galleryImg("bedrooms", "bedroom-2-alt2", "Second bedroom — headboard detail"),
  living1: galleryImg("living", "living-1", "Sitting lounge"),
  living2: galleryImg("living", "living-2", "Lounge — wide view"),
  dining1: galleryImg("dining", "dining-1", "Dining"),
  dining2: galleryImg("dining", "dining-2", "Dining — chandelier view"),
  dining3: galleryImg("dining", "dining-3", "Dining — side view"),
  kitchen1: galleryImg("kitchen", "kitchen-1", "Kitchen"),
  kitchen2: galleryImg("kitchen", "kitchen-2", "Kitchen — counter view"),
  kitchen3: galleryImg("kitchen", "kitchen-3", "Kitchen — wide view"),
  bathroom1: galleryImg("bathrooms", "bathroom-1", "Master bathroom"),
  bathroom1Alt1: galleryImg("bathrooms", "bathroom-1-alt1", "Second bathroom"),
  bathroom1Alt2: galleryImg("bathrooms", "bathroom-1-alt2", "Bathroom — vanity detail"),
  cityView: galleryImg("views", "city-view", "City view"),
} satisfies Record<string, Asset>;

// ────────────── Videos ──────────────
export type VideoAsset = {
  /** Public path to the .mp4 */
  src: string;
  /** Base path (no extension) for the poster image — yields .avif/.webp/.jpg. */
  posterBase: string;
  posterAlt: string;
};

export const videos = {
  galleryIntro: {
    src: "/assets/gallery/videos/intro.mp4",
    posterBase: "/assets/gallery/videos/intro-poster",
    posterAlt: "Apartment walk-through preview",
  },
} satisfies Record<string, VideoAsset>;

/** Helper: turn an Asset into the original-format URL (the safest <img src>). */
export const assetUrl = (a: Asset): string => `${a.base}.${a.fallbackExt}`;

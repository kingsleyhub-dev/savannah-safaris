import { forwardRef, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { type Asset, RESPONSIVE_WIDTHS } from "@/assets/registry";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  asset: Asset;
  /** Override the default alt text from the registry. */
  alt?: string;
  /**
   * Sizes attribute for responsive images. Defaults to a sensible full-bleed value.
   * Pass something like "(min-width: 1024px) 33vw, 100vw" for grid tiles.
   */
  sizes?: string;
  /**
   * "eager" for above-the-fold (hero, page hero) — disables lazy loading.
   * Defaults to "lazy".
   */
  loading?: "lazy" | "eager";
  /** Pair with loading="eager" for the LCP image to hint the browser. */
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
};

const buildSrcSet = (base: string, ext: "avif" | "webp" | "jpg" | "png") =>
  RESPONSIVE_WIDTHS.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");

/**
 * Modern <picture> wrapper:
 *   <picture>
 *     <source type="image/avif" srcSet="hero-480.avif 480w, …" />
 *     <source type="image/webp" srcSet="hero-480.webp 480w, …" />
 *     <img src="hero.jpg" loading="lazy" />
 *   </picture>
 *
 * Browsers pick AVIF first, fall back to WebP, then the original JPG/PNG.
 * Width hints (`srcSet … w`) + `sizes` let the browser pick the smallest file
 * that still looks sharp — usually a 30–80% byte saving over the original.
 *
 * Non-responsive assets (no sized variants on disk) just emit native-size
 * AVIF/WebP <source>s with a single fallback.
 */
export const ResponsiveImage = forwardRef<HTMLImageElement, Props>(function ResponsiveImage(
  { asset, alt, sizes = "100vw", loading = "lazy", fetchPriority, className, ...rest },
  ref,
) {
  const fallbackSrc = `${asset.base}.${asset.fallbackExt}`;

  if (asset.responsive) {
    return (
      <picture>
        <source type="image/avif" srcSet={buildSrcSet(asset.base, "avif")} sizes={sizes} />
        <source type="image/webp" srcSet={buildSrcSet(asset.base, "webp")} sizes={sizes} />
        <source type={asset.fallbackExt === "png" ? "image/png" : "image/jpeg"} srcSet={buildSrcSet(asset.base, asset.fallbackExt)} sizes={sizes} />
        <img
          ref={ref}
          src={fallbackSrc}
          alt={alt ?? asset.alt}
          loading={loading}
          decoding="async"
          // @ts-expect-error — fetchpriority is a valid HTML attribute, React types lag behind.
          fetchpriority={fetchPriority}
          className={cn(className)}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <picture>
      <source type="image/avif" srcSet={`${asset.base}.avif`} />
      <source type="image/webp" srcSet={`${asset.base}.webp`} />
      <img
        ref={ref}
        src={fallbackSrc}
        alt={alt ?? asset.alt}
        loading={loading}
        decoding="async"
        // @ts-expect-error — fetchpriority not in React types
        fetchpriority={fetchPriority}
        className={cn(className)}
        {...rest}
      />
    </picture>
  );
});

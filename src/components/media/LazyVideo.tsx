import { useState, useRef, type VideoHTMLAttributes } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type PosterSource = {
  /** Base path without extension — yields .avif / .webp / .jpg lookups. */
  base: string;
  alt: string;
};

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "poster"> & {
  src: string;
  poster: PosterSource | string;
  /** Optional class for the wrapper. */
  className?: string;
  /** Optional class for the <video> element when it mounts. */
  videoClassName?: string;
  ariaLabel?: string;
};

/**
 * Click-to-load video.
 *
 * Why bother?
 *   A 13MB <video preload="metadata"> still issues a request as soon as it enters the
 *   DOM — phones on slow networks pay the cost even when the user never plays it.
 *   By rendering only the poster + a Play button initially, the browser fetches a
 *   ~30KB image instead. The <video> mounts only after the user opts in.
 *
 * Poster images use <picture> so AVIF / WebP / JPG are negotiated automatically.
 */
export const LazyVideo = ({ src, poster, className, videoClassName, ariaLabel, controls = true, ...rest }: Props) => {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleActivate = () => {
    setActive(true);
    // Autoplay once the user opts in (gesture is preserved through React state).
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {/* ignore autoplay rejections */});
    });
  };

  if (active) {
    return (
      <video
        ref={videoRef}
        src={src}
        controls={controls}
        preload="metadata"
        className={cn("h-full w-full object-cover", videoClassName, className)}
        {...rest}
      />
    );
  }

  const posterFallback = typeof poster === "string" ? poster : `${poster.base}.jpg`;
  const posterAlt = typeof poster === "string" ? "" : poster.alt;

  return (
    <button
      type="button"
      onClick={handleActivate}
      aria-label={ariaLabel ?? "Play video"}
      className={cn(
        "group relative block h-full w-full overflow-hidden rounded-2xl bg-secondary",
        className,
      )}
    >
      {typeof poster === "string" ? (
        <img src={posterFallback} alt={posterAlt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <picture>
          <source type="image/avif" srcSet={`${poster.base}.avif`} />
          <source type="image/webp" srcSet={`${poster.base}.webp`} />
          <img src={`${poster.base}.jpg`} alt={poster.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </picture>
      )}
      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30 transition-colors group-hover:bg-black/40">
        <span className="grid size-16 place-items-center rounded-full bg-white/95 text-foreground shadow-2xl transition-transform group-hover:scale-110">
          <Play className="size-7 translate-x-0.5 fill-current" />
        </span>
      </span>
    </button>
  );
};

import Image from "next/image";

/**
 * Sawia brand mark + wordmark, served from /public/logo/.
 *
 * NOTE: the wordmark below is still the drawn PAXAWA letterforms — it is
 * path data, not text, so it cannot be renamed here. A Sawia wordmark is
 * an outstanding design asset; until it lands, the mark reads Paxawa.
 *
 *   <Logo variant="mark"     /> → just the icon (paw / wing form)
 *   <Logo variant="wordmark" /> → just the wordmark letterforms
 *   <Logo variant="full"     /> → mark + wordmark side by side, properly
 *                                 baseline-aligned
 *
 * Both source SVGs use fill="currentColor" so they inherit the surrounding
 * text color — drop the component into any context (white on black, black
 * on white, brand gradient) and it tints itself.
 *
 * We use plain <img> instead of next/image because:
 *   1) These are SVGs — no need for the optimization pipeline.
 *   2) currentColor only works on inline-rendered SVGs or referenced SVGs
 *      where the *referencing* element's color cascades. <img> preserves
 *      that; next/image renders to a remote CDN URL where currentColor
 *      stops cascading.
 */

type Variant = "mark" | "wordmark" | "full";

interface Props {
  variant?: Variant;
  /** Tailwind size shorthand applied to the icon mark. */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Override Tailwind classes for the outer wrapper. */
  className?: string;
}

const MARK_SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-4 w-5",
  sm: "h-5 w-[1.55rem]",
  md: "h-7 w-[2.15rem]",
  lg: "h-9 w-[2.75rem]",
  xl: "h-12 w-[3.7rem]",
};

/** Cap-height is ~0.7em, so the type is set a little larger than the box
 *  the drawn wordmark used to fill. Tuned to match the old lockup. */
const WORDMARK_TEXT: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-[0.95rem]",
  sm: "text-[1.1rem]",
  md: "text-[1.5rem]",
  lg: "text-[1.8rem]",
  xl: "text-[2.4rem]",
};

export function Logo({ variant = "full", size = "md", className }: Props) {
  if (variant === "mark") {
    return (
      <span className={["inline-block", MARK_SIZE[size], className].filter(Boolean).join(" ")}>
        <MarkSvg />
      </span>
    );
  }
  if (variant === "wordmark") {
    return (
      <span className={["inline-flex items-center", className].filter(Boolean).join(" ")}>
        <WordmarkText size={size} />
      </span>
    );
  }
  return (
    <span
      className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}
    >
      <span className={`inline-block ${MARK_SIZE[size]}`}>
        <MarkSvg />
      </span>
      <WordmarkText size={size} />
    </span>
  );
}

/* ── Inline SVGs ─────────────────────────────────────────────────────────
 * Inlined rather than served via /public/logo/*.svg so currentColor
 * cascades from the wrapping element. Source files exist in /public for
 * external use (OG images, email templates, share previews). */

function MarkSvg() {
  return (
    <svg
      viewBox="0 0 254 205"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-full w-auto"
      aria-hidden
    >
      <path
        d="M191.66 8.82001C125.91 -20.81 0 21.66 0.16 175.31L0 203.01C0 203.43 0.33 203.77 0.75 203.77C0.75 203.77 59.94 205.34 79.65 204.69C95.73 204.16 143.79 199.68 143.79 199.68L143.75 199.66C143.75 199.66 139.12 157.9 138.01 150.63C137.93 150.11 137.36 149.83 136.9 150.09L94.16 173.5C93.94 173.62 93.67 173.62 93.45 173.5L60.71 156.48C60.17 156.2 60.17 155.42 60.71 155.14L132.34 117.26C132.62 117.11 132.78 116.81 132.74 116.5L123.02 38.3C122.95 37.7 123.57 37.26 124.11 37.53C130.35 40.65 157.96 55.98 161.4 57.89C161.62 58.01 161.76 58.24 161.78 58.49L165.24 102.3C165.28 102.85 165.89 103.17 166.37 102.9L204.7 80.96C204.92 80.83 205.19 80.83 205.41 80.94L239.66 97.96C240.22 98.24 240.22 99.03 239.67 99.31L171.88 134.3C171.6 134.45 171.44 134.75 171.48 135.07L178.69 190.58C178.75 191.03 179.18 191.32 179.62 191.22L182.92 190.44C182.92 190.44 182.96 190.43 182.98 190.42C255.28 173 292 54.03 191.7 8.82001H191.66Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * INTERIM wordmark.
 *
 * The previous one was drawn letterforms spelling PAXAWA — path data, so
 * it could not be renamed when the app became Sawia, and it was the most
 * prominent thing on the sign-in screen still carrying the old name.
 * Rather than ship the wrong name, this sets the new one as text in the
 * brand face.
 *
 * It is a placeholder for a designed mark, not a final identity: it
 * matches the old lockup's height and inherits currentColor so nothing
 * around it had to change. Replace the whole function when the drawn
 * Sawia wordmark lands, and delete /public/logo/wordmark*.
 */
function WordmarkText({ size }: { size: NonNullable<Props["size"]> }) {
  return (
    <span
      className={`inline-block leading-none font-black tracking-[-0.03em] lowercase ${WORDMARK_TEXT[size]}`}
    >
      sawia
    </span>
  );
}

/**
 * Lockup used in spots that need a fixed-size raster fallback (PWA install
 * preview before service-worker installs, email signatures rendered outside
 * Tailwind, etc). Same files as the inline component, just delivered as a
 * regular <Image>.
 */
export function LogoRaster({
  variant = "mark",
  size = 32,
  className,
}: {
  variant?: "mark" | "wordmark";
  size?: number;
  className?: string;
}) {
  const src = variant === "mark" ? "/logo/mark.svg" : "/logo/wordmark.svg";
  const w = variant === "mark" ? size : Math.round(size * 4.85);
  return (
    <Image
      src={src}
      alt={variant === "mark" ? "Sawia logo" : "Sawia"}
      width={w}
      height={size}
      className={className}
      priority={false}
    />
  );
}

import Image from "next/image";

/**
 * Paxawa brand mark + wordmark, served from /public/logo/.
 *
 *   <Logo variant="mark"     /> → just the icon (paw / wing form)
 *   <Logo variant="wordmark" /> → just the "Paxawa" letterforms
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

const WORDMARK_HEIGHT: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-3",
  sm: "h-3.5",
  md: "h-5",
  lg: "h-6",
  xl: "h-8",
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
      <span className={["inline-block", WORDMARK_HEIGHT[size], className].filter(Boolean).join(" ")}>
        <WordmarkSvg />
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
      <span className={`inline-block ${WORDMARK_HEIGHT[size]}`}>
        <WordmarkSvg />
      </span>
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

function WordmarkSvg() {
  return (
    <svg
      viewBox="0 0 499 103"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-full w-auto"
      aria-label="Paxawa"
    >
      <path d="M80.08 34.01C78.87 52.09 67.46 61.71 50.16 64.81C47.16 65.35 44.43 65.52 41.32 65.47L38.55 65.78L23.78 65.83C23.28 65.83 22.64 66.38 22.46 66.92V100.51H0.0100098V0H45.88L50.43 0.46C69.93 1.97 81.4 14.25 80.08 34.01ZM49.28 46.23C56.57 42.66 58.85 33.87 55.96 26.27C55.18 24.21 53.56 22.16 51.74 20.78C48.21 18.11 43.83 17.48 39.47 17.3C35.63 17.13 31.89 17.1 28.03 17.27L22.8 17.51L22.52 22.74L22.44 47.59C22.44 48.01 23.38 48.69 23.78 48.69L39.09 48.5C42.54 48.46 46.07 47.81 49.28 46.23Z" fill="currentColor" />
      <path d="M410.78 22.4C411.06 21.31 411.49 20.3 412.8 20.3H428.08C428.66 20.94 428.45 21.98 428.21 22.76L426.13 29.5L421.77 43.7L414.41 68.9L407.22 95.32L405.74 100.53H385.63L380.15 78.77L374.9 56.36L373.23 49.49L371.46 55.47L369.23 64.43L366.32 75.54L360.86 98.49C361.02 99.13 360.42 100.53 359.77 100.53H340.6L333.98 76.89L327.14 52.53L320.5 28.65L319.57 25.02C319.16 23.42 318.78 22.11 318.79 20.31H340.83C341.99 20.32 342.09 22.3 342.26 23.05L345.8 38.43L347.05 43.5L353.24 68.52C353.53 69.68 353.44 70.95 354.76 71.2L355.85 65.82L356.77 61.89L357.92 56.68L362.42 38.75L365.57 25.82C366.03 23.91 366.24 22.2 367.29 20.32H383.52C384.91 20.32 385.42 21.36 385.67 22.45L386.61 26.47L387.75 31.31L396.26 65.44L397.21 69.73C397.43 70.7 397.72 71.83 398.81 71.71L400.16 65.26L408.52 31.29L409.71 26.47L410.76 22.42L410.78 22.4Z" fill="currentColor" />
      <path d="M246.72 63.87C250.39 58.86 257.92 55.01 264.11 53.99L272.44 52.62L277.36 52.25L281.32 51.96L291.54 51.65C292.14 47.08 291.46 42.59 288.81 38.99C285.25 34.16 277.59 33.18 271.6 34.44C266.78 35.45 262.84 38.05 260.76 42.59C259.89 44.49 258.4 44.93 256.28 44.8L250.51 44.45C249.62 42.93 249.37 40.74 248.95 38.83L247.86 33.91C247.51 32.34 246.49 30.53 246.98 28.89C252.09 24.8 257.89 22.39 264.16 20.78L271.74 19.3L275.26 18.99L286.35 19.03C293.85 19.48 301.24 22.01 306.5 27.61C310.46 31.83 312.91 37.61 312.94 43.51L313.19 87.51L314.04 93.29L315.36 100.45L295.32 100.52C294.63 99.79 294.21 98.67 294.05 97.78L292.94 91.24C292.36 91.4 291.77 91.98 291.21 92.62C283.28 101.74 270.61 104.46 259 101.66C251.25 99.79 245.21 93.95 243.19 86.23C241.21 78.67 242.05 70.21 246.71 63.85L246.72 63.87ZM282.63 85.93C287.55 84.27 291.19 79.8 291.32 74.61L291.48 68.33C291.52 66.62 291.78 65.44 291.41 63.65L283.66 63.98L278.05 64.34C275.39 64.51 272.85 65.15 270.36 66.23C264.33 68.84 261.84 76.18 265.18 81.81C267.47 85.67 271.67 87.11 275.93 86.94C278.25 86.85 280.21 86.75 282.63 85.94V85.93Z" fill="currentColor" />
      <path d="M425.63 85.18C423.4 72.95 427.26 62.34 438.62 56.97C445.52 53.7 453.01 52.67 460.66 52.39L465.46 51.98L473.86 51.66C474.82 43.31 471.77 36.05 463.4 34.39C456.32 32.99 447.82 34.75 444.17 41.19C443.07 43.13 441.49 44.23 439.19 44.63L434.72 45.41C434.07 44.12 433.61 42.37 433.2 40.81L431.27 33.6L430.18 28.77C436.78 23.67 447.06 19.86 455.12 19.28L458.4 19.05H467.65C479.41 19.07 491.36 26.12 494.85 38.45C495.4 40.4 496.13 42.72 496.14 44.83L496.26 84.34L496.6 88.57L497.53 94.99C497.8 96.87 498.36 98.56 498.32 100.52H477.95C476.15 97.64 477.15 93.55 475.5 90.56C468.9 99.12 459.24 103.17 448.86 102.65C446.6 102.54 444.69 102.43 442.49 101.95C434.11 100.11 427.19 93.64 425.64 85.18H425.63ZM458.12 87.31C463.8 87.42 468.38 85.24 471.59 80.81C473.2 78.6 474.11 76.37 474.18 73.5L474.42 64.11L466.08 64.21L462.12 64.47L455.06 65.74C451.58 66.36 448.63 68.8 447.29 71.93C445.68 75.71 445.99 79.61 448.29 82.82C450.59 86.03 453.94 87.22 458.1 87.3L458.12 87.31Z" fill="currentColor" />
      <path d="M83.71 84.36C83.2 81.03 83.21 77.52 83.57 74.27C84.61 64.87 91.53 57.77 100.34 55.1L106.56 53.54C109.81 52.72 113 52.65 116.28 52.37L121.06 51.97L130.65 51.76C131.02 51.76 131.68 51.52 131.88 51.31C132.61 50.51 131.91 45.61 131.17 43.02C129.29 36.5 123.44 34.15 116.74 34.24C108.31 34.35 104.48 36.86 101.11 44.76H93.96L90.72 43.55C89.54 41.94 89.57 40.08 89.32 38.19L88.3 30.5C88.08 28.81 88.73 27.82 90.15 26.93C97.29 22.48 105.45 19.88 113.92 19.21C118.27 18.87 122.32 18.57 126.56 19.18L131.22 19.85C137.35 20.72 144.57 24.89 148.5 29.93C151.41 33.66 152.83 38.39 153.28 43.05L153.72 47.65C154 50.52 153.72 53.19 153.72 56.07L153.66 81.22L153.93 84.75C154.18 88.04 154.15 91.14 154.78 94.31L156 100.53H135.17L134.04 95.49L133.19 91.1C127.07 98.54 118.58 102.75 109.04 102.67C105.7 102.64 102.7 102.56 99.44 101.68C91.32 99.5 85.05 93.04 83.72 84.36H83.71ZM111.41 86.44C119.14 88.96 128.61 85.64 131.18 77.85C132.35 74.28 132.42 70.59 132.3 66.89L132.2 63.68L125.54 63.85L120.6 64.19L116.76 64.54L111.64 65.95C106.77 67.69 104.16 71.98 104.45 77.07C104.69 81.38 107.03 85.02 111.41 86.45V86.44Z" fill="currentColor" />
      <path d="M240.81 97.78C241.43 98.65 242.16 99.19 242.21 100.5L216.51 100.53L204.67 82.41L201.43 77.55C200.91 76.84 200.28 76.17 199.63 75.61L193.17 85.09L184.8 98.14C184.71 98.84 183.71 100.46 182.9 100.46L159.77 100.41L178.98 72.66L188.04 59.73L178.9 46.48L171.57 35.95L162.17 21.86L162 20.87C161.95 20.6 162.76 20.4 163.1 20.3H185.46C185.95 20.36 187.26 20.68 187.53 21.12L191.26 27.11L201.59 43.64L203.65 40.86L214.27 23.49C214.84 22.56 215.67 21.42 215.67 21.42L216.42 20.7L224.22 20.44L238.97 20.33C239.22 21.09 239.13 22.09 238.69 22.69L220.66 47.7L213.95 57.55C213.32 58.47 214.31 59.81 214.87 60.62L233.21 87.13L240.82 97.79L240.81 97.78Z" fill="currentColor" />
    </svg>
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
      alt={variant === "mark" ? "Paxawa logo" : "Paxawa"}
      width={w}
      height={size}
      className={className}
      priority={false}
    />
  );
}

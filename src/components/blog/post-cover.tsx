import {
  UsersThree,
  Wallet,
  Sparkle,
  CompassRose,
  CellSignalSlash,
  Translate,
  Airplane,
} from "@phosphor-icons/react/dist/ssr";
import { TAGS, type BlogTag } from "@/lib/blog/posts";

/**
 * Blog v2 — generated, on-system post covers.
 *
 * Stock photos made the blog feel like someone else's site. Covers are
 * now built from the design system itself: the tag's semantic hue as a
 * layered radial glow on the app's charcoal, a faint blueprint grid,
 * and one oversized glyph. Zero network weight, zero attribution, and
 * unmistakably Paxawa.
 */

const ICONS: Record<string, React.ComponentType<{ className?: string; weight?: "duotone" }>> = {
  "Group travel": UsersThree,
  Money: Wallet,
  AI: Sparkle,
  Product: CompassRose,
  Offline: CellSignalSlash,
  Arabic: Translate,
};

const PATTERNS: Record<string, React.CSSProperties> = {
  grid: {
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  dots: {
    backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1.2px, transparent 1.2px)",
    backgroundSize: "20px 20px",
  },
  diag: {
    backgroundImage:
      "repeating-linear-gradient(-45deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 16px)",
  },
  arcs: {
    backgroundImage:
      "repeating-radial-gradient(circle at 110% -10%, rgba(255,255,255,0.5) 0 1px, transparent 1px 34px)",
  },
};

const TAG_PATTERN: Record<string, keyof typeof PATTERNS> = {
  "Group travel": "dots",
  Money: "grid",
  AI: "arcs",
  Product: "diag",
  Offline: "arcs",
  Arabic: "dots",
};

export function PostCover({
  tag,
  className = "",
}: {
  tag: BlogTag;
  className?: string;
}) {
  const hue = TAGS[tag]?.hue ?? "#8B7CFF";
  const Icon = ICONS[tag] ?? Airplane;
  return (
    <div
      aria-hidden
      className={`relative w-full h-full overflow-hidden bg-[#141414] ${className}`}
    >
      {/* hue glow — two offset radials so it reads layered, not flat */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 90% at 85% 10%, ${hue}30, transparent 60%), radial-gradient(60% 70% at 15% 95%, ${hue}1c, transparent 65%)`,
        }}
      />
      {/* per-tag texture — grid / dots / diagonals so covers read distinct */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={PATTERNS[TAG_PATTERN[tag] ?? "grid"]}
      />
      {/* oversized glyph, clipped at the corner */}
      <Icon
        weight="duotone"
        className="absolute -bottom-6 -end-6 w-32 h-32 sm:w-40 sm:h-40"
        // @ts-expect-error phosphor accepts style via SVG props
        style={{ color: hue, opacity: 0.55 }}
      />
      {/* hairline top accent */}
      <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: hue, opacity: 0.65 }} />
    </div>
  );
}

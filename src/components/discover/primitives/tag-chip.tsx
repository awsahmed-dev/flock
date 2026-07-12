"use client";

import { Sparkle as Sparkles } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Canonical contextual tags the engine attaches to a place (score.ts):
 * ✨ AI pick · Hidden gem · Crew favorite. One styling, used on cards, the
 * detail panel, and decision cards (design §4.1/§7).
 */
export type PlaceTag = "ai_pick" | "hidden_gem" | "crew_favorite";

const TAG_META: Record<
  PlaceTag,
  { labelKey: string; className: string; icon?: boolean }
> = {
  ai_pick: {
    labelKey: "discover.tagAiPick",
    className: "bg-primary text-primary-foreground shadow",
    icon: true,
  },
  hidden_gem: {
    labelKey: "discover.tagHiddenGem",
    className: "bg-amber-500/90 backdrop-blur text-white",
  },
  crew_favorite: {
    labelKey: "discover.tagCrewFav",
    className: "bg-cyan-500/90 backdrop-blur text-white",
  },
};

const KNOWN: PlaceTag[] = ["ai_pick", "hidden_gem", "crew_favorite"];

export function TagChip({ tag, className }: { tag: PlaceTag; className?: string }) {
  const t = useT();
  const meta = TAG_META[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
        meta.className,
        className,
      )}
    >
      {meta.icon && <Sparkles className="w-3 h-3" />}
      {t(meta.labelKey)}
    </span>
  );
}

/** Render every known tag present in a place's tag list, in priority order. */
export function TagChips({
  tags,
  className,
  chipClassName,
}: {
  tags: readonly string[];
  className?: string;
  chipClassName?: string;
}) {
  const present = KNOWN.filter((k) => tags.includes(k));
  if (present.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-start gap-1", className)}>
      {present.map((tag) => (
        <TagChip key={tag} tag={tag} className={chipClassName} />
      ))}
    </div>
  );
}

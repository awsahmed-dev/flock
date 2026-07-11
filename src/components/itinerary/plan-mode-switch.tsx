"use client";

import { useEffect, useRef, useState } from "react";
import { Map, CreditCard } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

/**
 * TikTok-style horizontal swipe between two modes inside the Plan page:
 * Map (default) and Book (affiliate CTAs). The segment indicator at the
 * top syncs with the scroll position so swiping feels native.
 *
 * Implementation: a horizontal CSS scroll-snap container with two
 * full-width children. The Map child holds whatever the parent passes;
 * the Book child is rendered separately so the heavy Mapbox instance
 * doesn't re-mount on every swipe.
 *
 * Tapping the segment scrolls programmatically with smooth behavior; a
 * native horizontal pan triggers onScroll → state sync.
 */
interface Props {
  mapContent: React.ReactNode;
  bookContent: React.ReactNode;
  /** Total container height — passed through so the wrapper inherits
   *  the same canvas height the Plan page uses today. */
  className?: string;
}

export function PlanModeSwitch({ mapContent, bookContent, className }: Props) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"map" | "book">("map");
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === "rtl");
  }, []);

  function switchTo(next: "map" | "book") {
    const el = scrollerRef.current;
    if (!el) return;
    const target = next === "map" ? 0 : el.clientWidth;
    el.scrollTo({
      left: isRtl ? -target : target,
      behavior: "smooth",
    });
    setMode(next);
  }

  function syncFromScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const left = Math.abs(el.scrollLeft);
    const ratio = left / w;
    const next = ratio > 0.5 ? "book" : "map";
    if (next !== mode) setMode(next);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Floating segment switch — sits above both views. */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg p-1">
          <SegmentButton
            active={mode === "map"}
            onClick={() => switchTo("map")}
            icon={Map}
            label={t("plan.modeMap")}
          />
          <SegmentButton
            active={mode === "book"}
            onClick={() => switchTo("book")}
            icon={CreditCard}
            label={t("plan.modeBook")}
          />
        </div>
      </div>

      {/* Horizontal scroller with snap. Each child is one viewport page. */}
      <div
        ref={scrollerRef}
        onScroll={syncFromScroll}
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scrollbar-none"
        // Snap-stop on every page. We let the user pan/swipe freely;
        // CSS does the rest.
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="min-w-full w-full shrink-0 snap-start snap-always relative overflow-hidden">
          {mapContent}
        </div>
        <div className="min-w-full w-full shrink-0 snap-start snap-always relative overflow-y-auto bg-background">
          {bookContent}
        </div>
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Paxawa v2 — required attribution (planning §5.6, design §6).
 *
 * Google's terms require "Powered by Google" wherever Places data shows without
 * a Google-rendered map. We render places on Mapbox, so this belongs on every
 * Discover surface — feed footer, detail panel, decision card. Photo- and
 * review-author attributions render separately where that content shows.
 *
 * The brand name "Google" stays as-is; only "Powered by" localizes. Subtle by
 * design — present and compliant, never loud. Swap in the official lockup asset
 * before public launch if Google requires it for our usage tier.
 */
export function PoweredByGoogle({ className }: { className?: string }) {
  const t = useT();
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 select-none",
        className,
      )}
    >
      <span>{t("discover.poweredBy")}</span>
      <span aria-hidden className="font-semibold tracking-tight">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
      </span>
      <span className="sr-only">Google</span>
    </p>
  );
}

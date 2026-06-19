"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Canonical price level — active "$" up to `level` (1–4) over a muted full
 * scale, so $$ reads as "moderate" at a glance against the $–$$$$ range
 * (design §4.1). Renders nothing when Google has no price signal.
 */
export function PriceLevel({
  level,
  className,
}: {
  level: number | null | undefined;
  className?: string;
}) {
  const t = useT();
  if (level == null || level <= 0) return null;
  const n = Math.min(Math.max(Math.round(level), 1), 4);
  return (
    <span
      className={cn("inline-flex items-center font-semibold", className)}
      aria-label={t("discover.priceLevelAria", { n, max: 4 })}
    >
      <span className="text-emerald-600 dark:text-emerald-400">{"$".repeat(n)}</span>
      {n < 4 && <span className="text-muted-foreground/40">{"$".repeat(4 - n)}</span>}
    </span>
  );
}

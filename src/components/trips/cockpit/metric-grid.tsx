"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/locale-provider";
import { MapPin, Wallet, Users, Package, CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Phase 6 §3-B(5) — the 2×2 metric row, tokenized. Icon + ≤8-char
 * UPPERCASE label on top, line-clamped value below; guaranteed 2 lines,
 * every cell tappable (§11-G: min-height 72px, line-clamp-1 values).
 */
export function MetricGrid({
  tripId,
  placesCount,
  budgetTotal,
  currency,
  crewCount,
  packing,
  showPlanned = true,
}: {
  tripId: string;
  placesCount: number;
  budgetTotal: number | null;
  currency: string;
  crewCount: number;
  packing: { packed: number; total: number };
  /** PLANNING hides this cell — it duplicates the screen's primary action.
   *  DEPARTURE keeps it: there the primary action is the departure board. */
  showPlanned?: boolean;
}) {
  const t = useT();
  const base = `/trips/${tripId}`;
  const cells = [
    ...(showPlanned
      ? [
          {
            icon: MapPin,
            label: t("cockpit.metricPlanned"),
            value: placesCount > 0 ? t("cockpit.metricStops", { count: placesCount }) : t("cockpit.metricStart"),
            href: `${base}/itinerary`,
          },
        ]
      : []),
    {
      icon: Wallet,
      label: t("cockpit.metricBudget"),
      value: budgetTotal != null ? `${currency} ${Math.round(budgetTotal).toLocaleString()}` : t("cockpit.metricNotSet"),
      href: `${base}/money`,
    },
    {
      icon: Users,
      label: t("cockpit.metricCrew"),
      // "1 person" reads like a statistic about strangers. "Just you" reads
      // like the app noticing, which is the nudge that matters here.
      value: crewCount <= 1 ? t("cockpit.metricJustYou") : t("cockpit.metricPeople", { count: crewCount }),
      href: `${base}/members`,
    },
    {
      icon: Package,
      label: t("cockpit.metricPacking"),
      value: packing.total > 0 ? t("cockpit.metricItems", { packed: packing.packed, total: packing.total }) : t("cockpit.metricCreate"),
      href: `${base}/pack`,
    },
  ];

  return (
    <div className={showPlanned ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-2.5"}>
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <Link
            key={cell.label}
            href={cell.href}
            className="flex flex-col justify-between rounded-2xl p-3 bg-card border border-border min-h-[72px] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-1.5">
              <Icon size={18} className="shrink-0 text-primary" />
              {/* 3-up cells are ~113px wide at 390px. Verified by render: the
                  wide tracking plus the decorative chevron pushed "BUDGET" and
                  "PACKING" onto a second line in both Inter and the fallback.
                  The chevron is redundant anyway — the whole cell is the link. */}
              <span
                className={`text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap ${
                  showPlanned ? "tracking-wider" : "tracking-normal"
                }`}
              >
                {cell.label}
              </span>
              {showPlanned && (
                <ChevronRight size={12} className="ms-auto text-tertiary rtl:rotate-180" />
              )}
            </div>
            <p className="line-clamp-1 mt-1 text-[15px] font-bold text-foreground">{cell.value}</p>
          </Link>
        );
      })}
    </div>
  );
}

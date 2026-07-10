import Link from "next/link";
import { MapPin, Wallet, Users, Package, ChevronRight } from "lucide-react";

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
}: {
  tripId: string;
  placesCount: number;
  budgetTotal: number | null;
  currency: string;
  crewCount: number;
  packing: { packed: number; total: number };
}) {
  const base = `/trips/${tripId}`;
  const cells = [
    {
      icon: MapPin,
      label: "PLANNED",
      value: placesCount > 0 ? `${placesCount} stops` : "Start →",
      href: `${base}/itinerary`,
    },
    {
      icon: Wallet,
      label: "BUDGET",
      value: budgetTotal != null ? `${currency} ${Math.round(budgetTotal).toLocaleString()}` : "Not set",
      href: `${base}/money`,
    },
    {
      icon: Users,
      label: "CREW",
      value: `${crewCount} ${crewCount === 1 ? "person" : "people"}`,
      href: `${base}/members`,
    },
    {
      icon: Package,
      label: "PACKING",
      value: packing.total > 0 ? `${packing.packed}/${packing.total} items` : "Create →",
      href: `${base}/pack`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <Link
            key={cell.label}
            href={cell.href}
            className="flex flex-col justify-between rounded-2xl p-3 bg-card border border-border min-h-[72px] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-1.5">
              <Icon size={18} className="text-primary" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                {cell.label}
              </span>
              <ChevronRight size={12} className="ms-auto text-tertiary rtl:rotate-180" />
            </div>
            <p className="line-clamp-1 mt-1 text-[15px] font-bold text-foreground">{cell.value}</p>
          </Link>
        );
      })}
    </div>
  );
}

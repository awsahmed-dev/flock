"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/locale-provider";

/**
 * MANAGE sub-navigation (redesign brief Screen E). A sticky tab bar shown atop
 * the three MANAGE surfaces — Expenses · Bookings · Pack — so they read as one
 * section. Active tab = accent text + underline.
 */
export function ManageTabs({
  tripId,
  active,
}: {
  tripId: string;
  active: "expenses" | "bookings" | "pack";
}) {
  const t = useT();
  const tabs = [
    { key: "expenses" as const, label: t("manage.expenses"), href: `/trips/${tripId}/expenses` },
    { key: "bookings" as const, label: t("manage.bookings"), href: `/trips/${tripId}/wallet` },
    { key: "pack" as const, label: t("manage.pack"), href: `/trips/${tripId}/pack` },
  ];
  return (
    <div className="sticky top-[52px] z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex gap-1 max-w-3xl mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              className={`relative px-4 h-12 flex items-center text-sm font-bold transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

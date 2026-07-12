"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House as Home, Compass, GridFour as LayoutGrid, CaretLeft as ChevronLeft } from "@phosphor-icons/react/dist/ssr";
import type { Icon as LucideIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

/**
 * Desktop nav (redesign brief §2.3): a 280px fixed left column shown only at
 * ≥1280px (xl). Below that the bottom tab bar is the sole nav. The old
 * multi-tab sidebar is gone — this is just the three modes + a way back to the
 * trip list.
 */
interface Mode {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive: (p: string, b: string) => boolean;
}

const MODES: Mode[] = [
  { key: "now", label: "Now", icon: Home, href: "", isActive: (p, b) => p === b },
  { key: "discover", label: "Discover", icon: Compass, href: "/discover", isActive: (p, b) => p.startsWith(`${b}/discover`) },
  { key: "manage", label: "Manage", icon: LayoutGrid, href: "/expenses", isActive: (p, b) => new RegExp(`^${b}/(manage|expenses|wallet|pack|members|settings)`).test(p) },
];

export function DesktopModeNav({ tripId, tripName }: { tripId: string; tripName: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <aside className="hidden xl:flex fixed inset-y-0 start-0 w-[280px] z-40 flex-col border-e border-border bg-card px-4 py-5">
      <Link href="/dashboard" className="flex items-center gap-2 text-foreground">
        <Logo variant="full" size="sm" />
      </Link>

      <Link
        href="/dashboard"
        prefetch
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        All trips
      </Link>

      <p className="mt-5 type-h2 line-clamp-2">{tripName}</p>

      <nav className="mt-6 flex flex-col gap-1">
        {MODES.map((m) => {
          const active = m.isActive(pathname, base);
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              href={`${base}${m.href}`}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 h-11 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

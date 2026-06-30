"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The reinvention's primary navigation (redesign brief §2.1). Three modes,
 * fixed to the bottom, shown below the desktop breakpoint (xl = 1280px); the
 * desktop sidebar takes over at ≥xl. 60px tall + the iOS safe-area inset, so
 * content never hides behind the home indicator (brief §4 BUG 8). Each tab is
 * a ≥44px tap target (brief §1.7). No badges on tabs — notification state lives
 * inside each section.
 */
interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive: (path: string, base: string) => boolean;
}

const TABS: Tab[] = [
  { key: "now", label: "Now", icon: Home, href: "", isActive: (p, b) => p === b },
  {
    key: "discover",
    label: "Discover",
    icon: Compass,
    href: "/discover",
    isActive: (p, b) => p.startsWith(`${b}/discover`),
  },
  {
    // MANAGE currently lands on the existing Expenses route; the dedicated
    // /manage shell (Expenses · Bookings · Pack) arrives in a later step.
    key: "manage",
    label: "Manage",
    icon: LayoutGrid,
    href: "/expenses",
    isActive: (p, b) =>
      new RegExp(`^${b}/(manage|expenses|wallet|pack|members|settings)`).test(p),
  },
];

export function BottomTabBar({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav
      aria-label="Trip sections"
      className="xl:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/75 pb-[env(safe-area-inset-bottom)]"
      style={{
        // Inline, NOT a class: the build (Lightning CSS) strips backdrop-filter
        // from stylesheets — both hand-authored CSS and Tailwind's backdrop-blur
        // utility (verified live: both compute to `none`). Inline styles bypass
        // the bundler so the glass blur actually renders. translateZ(0) forces
        // GPU compositing so the blur stays smooth while the page scrolls.
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.isActive(pathname, base);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={`${base}${tab.href}`}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 h-[60px] min-w-[44px] transition-colors",
              active ? "text-primary" : "text-tertiary hover:text-foreground",
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
            <span className="text-[11px] font-semibold tracking-wide">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

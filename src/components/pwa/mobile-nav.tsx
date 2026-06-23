"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, MapPin, Wallet, Compass, Backpack } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  tripId: string;
  onChatToggle: () => void;
  chatOpen: boolean;
  /** Live counts shown as red badges on tab icons. Pass 0 to hide. */
  badges?: {
    home?: number;
    itinerary?: number;
    expenses?: number;
    chat?: number;
    documents?: number;
    wallet?: number;
  };
}

/**
 * Floating pill bottom nav (Telegram-style). 4 tabs only — Crew lives as a
 * top-right sheet in the header now. Each tab can show a red badge with
 * a pending-action count. Active tab has a tinted indicator pill behind it.
 *
 * P0-2: shown up to lg (phone + tablet). The lg+ desktop has the
 * persistent left sidebar, so this hides there. The old top sub-nav strip
 * that used to cover the sm–lg tablet band is gone — this bottom nav is
 * now the single primary nav for that band too.
 */
export function MobileNav({ tripId, onChatToggle, chatOpen, badges = {} }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();
  // B17 (audit fix #6): Wallet replaces Pack in the mobile bottom nav
  // when affiliate preview is on. Pack moves to the top sub-nav (still
  // reachable via overview action grid). Once we sign affiliates and
  // ship Wallet to everyone, drop the preview flag.
  // B18: Wallet ships to everyone. Preview gate removed.
  const showWallet = true;
  void searchParams;

  // B20: bottom nav holds exactly 5 primary tabs — Home / Plan / Money /
  // Wallet / Pack. Chat moves out of the bottom nav into the More sheet
  // (top-right ⋯ icon in the trip header). Pack returns as a first-class
  // tab so users on a trip can reach packing in one tap.
  void showWallet;
  // P0-1: canonical keys — the SAME nav.* key per route as the desktop
  // sidebar, so every surface resolves one label per destination (Plan /
  // Money / Discover / Pack), and a grep shows one key per route.
  const tabs = [
    { id: "home" as const,      label: t("nav.overview"),   href: `/trips/${tripId}`,           icon: Sparkles,   exact: true },
    { id: "itinerary" as const, label: t("nav.itinerary"),  href: `/trips/${tripId}/itinerary`, icon: MapPin,     exact: false },
    { id: "expenses" as const,  label: t("nav.expenses"),   href: `/trips/${tripId}/expenses`,  icon: Wallet,     exact: false },
    { id: "discover" as const,  label: t("nav.discover"),   href: `/trips/${tripId}/discover`,  icon: Compass,    exact: false },
    { id: "documents" as const, label: t("nav.pack"),       href: `/trips/${tripId}/pack`,       icon: Backpack,   exact: false },
  ];

  return (
    <div className="lg:hidden fixed left-0 right-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-[460px] h-16 flex items-stretch px-1 rounded-full bg-card border border-border shadow-2xl shadow-black/40 backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const badge = (badges as Record<string, number | undefined>)[tab.id] ?? 0;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              /* Eager prefetch — same reasoning as the desktop tabs.
                 On mobile this fires on touchstart so the route is warm
                 before the finger lifts. */
              prefetch
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full m-1 transition-all relative",
                isActive
                  ? "bg-primary/15 text-primary font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <tab.icon
                  className={cn(
                    "transition-transform",
                    isActive ? "w-[22px] h-[22px]" : "w-5 h-5"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive border-[1.5px] border-card flex items-center justify-center text-[9px] font-black text-white leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wider">{tab.label}</span>
            </Link>
          );
        })}

        {/* B20: Chat moved into the More sheet (top-right ⋯ icon in the
            trip header). Bottom nav stays at 5 primary tabs. */}
      </nav>
    </div>
  );
}

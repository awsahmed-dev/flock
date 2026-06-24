"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, MapPin, Wallet, Compass, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  tripId: string;
  onChatToggle: () => void;
  chatOpen: boolean;
  /** Opens the Tools sheet (the mobile twin of the desktop Tools hub). */
  onToolsOpen: () => void;
  /** True while the Tools sheet is open — keeps the Tools tab lit. */
  toolsOpen?: boolean;
  /** Small dot on Tools when any tool needs attention. */
  toolsDot?: boolean;
  /** Live counts shown as red badges on tab icons. Pass 0 to hide. */
  badges?: {
    home?: number;
    itinerary?: number;
    expenses?: number;
    chat?: number;
    discover?: number;
    wallet?: number;
  };
}

/**
 * Floating pill bottom nav (Telegram-style). Exactly 5 thumb-zone slots:
 * 4 CORE link tabs (Overview · Plan · Discover · Money) + a Tools button
 * that opens the Tools sheet — the mobile twin of the desktop Tools hub.
 * Each tab can show a red badge with a pending-action count; the active
 * tab has a tinted indicator pill behind it.
 *
 * Founder-decided IA: Bookings + Pack leave the bottom nav into Tools; Chat
 * stays the overlay handle (its needs-vote badge lives on that handle/sheet,
 * not here). Shown up to lg — the lg+ desktop has the persistent sidebar.
 */
export function MobileNav({
  tripId,
  onChatToggle,
  chatOpen,
  onToolsOpen,
  toolsOpen = false,
  toolsDot = false,
  badges = {},
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();
  void searchParams;
  void onChatToggle;
  void chatOpen;

  // P0-1: canonical keys — the SAME nav.* key per route as the desktop
  // sidebar, so every surface resolves one label per destination (Plan /
  // Discover / Money), and a grep shows one key per route.
  const tabs = [
    { id: "home" as const,      label: t("nav.overview"),  href: `/trips/${tripId}`,           icon: Sparkles, exact: true },
    { id: "itinerary" as const, label: t("nav.itinerary"), href: `/trips/${tripId}/itinerary`, icon: MapPin,   exact: false },
    { id: "discover" as const,  label: t("nav.discover"),  href: `/trips/${tripId}/discover`,  icon: Compass,  exact: false },
    { id: "expenses" as const,  label: t("nav.expenses"),  href: `/trips/${tripId}/expenses`,  icon: Wallet,   exact: false },
  ];

  return (
    <div className="lg:hidden fixed left-0 right-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none">
      {/* Paxawa Control Language (§4): the floating bottom nav is part of the
          glass control layer — glass-on-light, with the reduced-transparency
          fallback to a solid bar baked into `.glass-light`. */}
      <nav className="glass-light pointer-events-auto mx-auto max-w-[460px] h-16 flex items-stretch px-1 rounded-full shadow-2xl shadow-black/40">
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

        {/* Tools — the 5th slot. Opens the Tools sheet (mobile twin of the
            desktop hub), the single overflow concept. A small dot lights it
            when any tool needs attention. */}
        <button
          type="button"
          onClick={onToolsOpen}
          aria-label={t("nav.tools")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full m-1 transition-all relative",
            toolsOpen
              ? "bg-primary/15 text-primary font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <LayoutGrid
              className={cn(
                "transition-transform",
                toolsOpen ? "w-[22px] h-[22px]" : "w-5 h-5"
              )}
              strokeWidth={toolsOpen ? 2.5 : 2}
            />
            {toolsDot && (
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-destructive border-[1.5px] border-card" />
            )}
          </div>
          <span className="text-[10px] tracking-wider">{t("nav.tools")}</span>
        </button>
      </nav>
    </div>
  );
}

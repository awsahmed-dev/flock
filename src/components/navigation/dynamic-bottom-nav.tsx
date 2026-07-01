"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format as isoFmt } from "date-fns";
import { toast } from "sonner";
import {
  Home, Compass, LayoutGrid, Wrench, Plus, Heart, Search,
  Map as MapIcon, MessageSquare, Wallet, Sparkles, MapPin, ChevronRight,
  Users, CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AddPlaceSearch } from "@/components/itinerary/add-place-search";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { useT } from "@/components/i18n/locale-provider";

/**
 * §9 (Fix Pass 1) — the Shopify-style dynamic bottom nav, rendered as a floating
 * frosted-glass PILL (not a full-width bar). The three centre tabs never change;
 * the left/right slots MORPH by mode:
 *   NOW      → 🔧 Tools speed-dial (floating pills) · + action sheet
 *   DISCOVER → ❤ Saved (count badge) · 🔍 Search
 *   MANAGE   → slots collapse; each surface owns its own add UI.
 *
 * Discover's Saved/Search drive the feed via window CustomEvents. Backdrop-filter
 * is INLINE everywhere — the bundler strips it from stylesheets.
 */
const PILL_GLASS = {
  // Fix 5 (pass 2): border-radius is INLINE so the pill is always rounded — on
  // light MANAGE pages it stayed a flat full-width dark bar when the radius came
  // only from a class. The dark glass is intentional on light pages (contrast).
  borderRadius: "20px",
  background: "rgba(10,10,10,0.82)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
  transform: "translateZ(0)",
} as const;

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive: (p: string, b: string) => boolean;
}

export function DynamicBottomNav({
  tripId,
  destination = "",
  days = [],
  upcoming = false,
  currency = "USD",
  budgetTotal = null,
}: {
  tripId: string;
  destination?: string;
  days?: string[];
  /** Fix 4-B/6: an upcoming (not-yet-started) trip has no NOW cockpit — the
   *  root shows the pre-start overview, so hide Tools and swap the [+] sheet. */
  upcoming?: boolean;
  currency?: string;
  budgetTotal?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const base = `/trips/${tripId}`;

  const isNow = pathname === base;
  const isDiscover = pathname.startsWith(`${base}/discover`);
  const mode: "now" | "discover" | "manage" | "other" = isNow
    ? "now"
    : isDiscover
      ? "discover"
      : /^\/trips\/[^/]+\/(manage|expenses|wallet|pack|members|settings)/.test(pathname)
        ? "manage"
        : "other";

  const [speedDial, setSpeedDial] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [getReadyOpen, setGetReadyOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setSpeedDial(false);
    setPlusOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onCount(e: Event) {
      setSavedCount((e as CustomEvent<number>).detail ?? 0);
    }
    window.addEventListener("discover:savedCount", onCount as EventListener);
    window.dispatchEvent(new CustomEvent("discover:requestCount"));
    return () => window.removeEventListener("discover:savedCount", onCount as EventListener);
  }, [pathname]);

  const tabs: Tab[] = [
    { key: "now", label: t("nav.now"), icon: Home, href: "", isActive: (p, b) => p === b },
    { key: "discover", label: t("nav.discover"), icon: Compass, href: "/discover", isActive: (p, b) => p.startsWith(`${b}/discover`) },
    { key: "manage", label: t("nav.manage"), icon: LayoutGrid, href: "/expenses", isActive: () => mode === "manage" },
  ];

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

  // Fix 3: exactly two Tools — Chat (bottom, appears first) then Full map (top).
  const speedItems = [
    { icon: MessageSquare, label: t("now.chat"), go: `${base}/chat` },
    { icon: MapIcon, label: t("now.fullMap"), go: `${base}/itinerary` },
  ];

  const todayIso = isoFmt(new Date(), "yyyy-MM-dd");
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? "";

  return (
    <div className="xl:hidden">
      {/* Transparent scrim — closes the speed-dial on an outside tap; the map
          stays fully visible (no dark overlay). */}
      {speedDial && (
        <button type="button" aria-hidden onClick={() => setSpeedDial(false)} className="fixed inset-0 z-40" />
      )}

      {/* Fixed pill wrapper — px-3 floats the pill 12px off each edge; the
          padding row itself is non-interactive so the map shows through. */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pointer-events-none">
        <div className="relative mx-auto max-w-lg pointer-events-auto">
          {/* Fix 2: Tools speed-dial — floating content-width pills stacked above
              the left slot (flex-col-reverse → item[0] closest to the button).
              Fix 6: only on the active NOW cockpit — not on an upcoming trip. */}
          {mode === "now" && !upcoming && (
            <div className={cn("absolute bottom-full start-1 mb-3 flex flex-col-reverse gap-2", !speedDial && "pointer-events-none")}>
              {speedItems.map((it, i) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    type="button"
                    onClick={() => { setSpeedDial(false); router.push(it.go); }}
                    className="flex items-center gap-2 rounded-full px-4 active:scale-95 self-start"
                    style={{
                      height: 40,
                      background: "rgba(15,15,15,0.92)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                      opacity: speedDial ? 1 : 0,
                      transform: speedDial ? "translateY(0) scale(1)" : "translateY(12px) scale(0.92)",
                      transition: `opacity 180ms ease ${i * 50}ms, transform 180ms ease ${i * 50}ms`,
                    }}
                  >
                    <Icon size={16} className="text-primary" />
                    <span className="text-sm font-medium text-white whitespace-nowrap">{it.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Fix 1: the floating pill itself. Height 56px; always dark glass. */}
          <nav
            aria-label="Trip sections"
            className="flex items-center h-14 rounded-2xl overflow-hidden"
            style={PILL_GLASS}
          >
            {/* LEFT slot — Fix 6: Tools only on the active NOW cockpit; hidden on
                upcoming trips and (already) on Manage. */}
            <Slot show={(mode === "now" && !upcoming) || mode === "discover"}>
              {mode === "now" && !upcoming && (
                <SlotButton onClick={() => setSpeedDial((v) => !v)} icon={Wrench} label={t("nav.tools")} rotated={speedDial} />
              )}
              {mode === "discover" && (
                <SlotButton onClick={() => dispatch("discover:openWishlist")} icon={Heart} label={t("discover.savedTitle")} badge={savedCount} />
              )}
            </Slot>

            {/* CENTRE — the three modes. */}
            {tabs.map((tab) => {
              const active = tab.isActive(pathname, base);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={`${base}${tab.href}`}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className="flex-1 flex items-center justify-center h-full min-w-[44px]"
                >
                  <span
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-colors duration-200",
                      active ? "text-primary" : "text-white/55 hover:bg-white/10 active:bg-white/10",
                    )}
                    style={active ? { background: "rgba(107, 92, 231, 0.20)" } : undefined}
                  >
                    <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 2} />
                    <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
                  </span>
                </Link>
              );
            })}

            {/* RIGHT slot — [+] shows on NOW (active OR upcoming); the sheet it
                opens differs (4-B). */}
            <Slot show={mode === "now" || mode === "discover"}>
              {mode === "now" && (
                <SlotButton onClick={() => (upcoming ? setGetReadyOpen(true) : setPlusOpen(true))} icon={Plus} label={t("nav.add")} accent />
              )}
              {mode === "discover" && (
                <SlotButton onClick={() => dispatch("discover:toggleSearch")} icon={Search} label={t("nav.search")} />
              )}
            </Slot>
          </nav>
        </div>
      </div>

      {/* NOW [+] action sheet (§9-D). */}
      <BottomSheet open={plusOpen} onClose={() => setPlusOpen(false)} title={t("nav.addTitle")} size="sm">
        <div className="divide-y divide-border/60">
          {/* Fix 5: opens the inline place-search sub-sheet — never navigates. */}
          <ActionRow icon={MapPin} label={t("nav.addPlace")} onClick={() => { setPlusOpen(false); setAddPlaceOpen(true); }} />
          {/* Fix 6: toast, never navigate. */}
          <ActionRow icon={Sparkles} label={t("nav.aiFillDay")} onClick={() => { setPlusOpen(false); toast(`${t("nav.aiComingSoon")} ✦`); }} />
          <ActionRow icon={MessageSquare} label={t("nav.suggestCrew")} onClick={() => { setPlusOpen(false); router.push(`${base}/discover`); }} />
          <ActionRow icon={Wallet} label={t("now.logExpense")} onClick={() => { setPlusOpen(false); router.push(`${base}/expenses`); }} />
        </div>
      </BottomSheet>

      {/* Fix 5: the inline place-search sub-sheet — the same component the Plan
          page uses. Adds to today by default; stays on the NOW screen. */}
      <AddPlaceSearch
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        tripId={tripId}
        destination={destination}
        destinationCenter={null}
        days={days}
        defaultDay={defaultDay}
      />

      {/* Fix 4-B: the upcoming-trip [+] sheet — get-ready actions, not the
          active-trip "add to today" set. */}
      <BottomSheet open={getReadyOpen} onClose={() => setGetReadyOpen(false)} title={t("nav.getReadyTitle")} size="sm">
        <div className="divide-y divide-border/60">
          <ActionRow icon={Users} label={t("nav.inviteCrew")} onClick={() => { setGetReadyOpen(false); router.push(`${base}/members`); }} />
          <ActionRow icon={CalendarDays} label={t("nav.planDay")} onClick={() => { setGetReadyOpen(false); router.push(`${base}/itinerary`); }} />
          <ActionRow icon={Wallet} label={t("nav.setBudget")} onClick={() => { setGetReadyOpen(false); setBudgetOpen(true); }} />
        </div>
      </BottomSheet>
      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} tripId={tripId} currency={currency} total={budgetTotal} />
    </div>
  );
}

/** A side slot that collapses (width 0) when its mode has no slot content. */
function Slot({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden transition-[width,opacity] duration-200 ease-out",
        show ? "w-14 opacity-100" : "w-0 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function SlotButton({
  onClick,
  icon: Icon,
  label,
  badge,
  rotated,
  accent,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  badge?: number;
  rotated?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200",
          accent ? "bg-primary text-primary-foreground" : "text-white",
          rotated && "rotate-45",
        )}
      >
        <Icon className="w-5 h-5" />
      </span>
      {badge != null && badge > 0 && (
        <span className="absolute top-0 end-0 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

function ActionRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 h-14 px-1 text-start active:bg-muted/40 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="flex-1 font-semibold text-[15px]">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

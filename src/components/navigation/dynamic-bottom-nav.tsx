"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format as isoFmt } from "date-fns";
import {
  Compass, Plus, MapPin, ChevronRight, Users, CalendarDays, Sparkles,
  Wallet, Share2, PlaneTakeoff, Navigation, Image as ImageIcon, HandCoins,
  Camera, Search, House, Luggage,
  FileText, X,
  type LucideIcon,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import glass from "./nav-glass.module.css";
import {
  Tabs,
  TabsList,
  TabsHighlight,
  TabsHighlightItem,
} from "@/components/animate-ui/primitives/animate/tabs";
import { AddPlaceSearch } from "@/components/itinerary/add-place-search";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { tripPhase, type TripPhase } from "@/lib/trip-phase";
import { createClient } from "@/lib/supabase/client";

/**
 * Phase 6 §3-A — the phase-aware NavPill.
 *
 * ASSEMBLY: [44px Huddle circle] [8px] [pill min(250px, calc(100vw-140px))]
 *           [8px] [44px accent + circle], wrapper fixed bottom, justify-center,
 *           safe-area padding inline. All backdropFilter INLINE (§0 rule 1) —
 *           the bundler strips it from stylesheets.
 *
 * Tabs, [+] default, and labels all come from tripPhase() — the single
 * source of truth (§2). The pill is NEVER hard 250px (§0 rule 8): it
 * shrinks on 360px viewports via min().
 */
/* Sprint 6 FIX-3 — Figma pill nav (node 2002:192): three same-height
 * floating glass elements. Values from the design:
 *   glass  — light rgba(255,255,255,0.46) · dark rgba(10,10,10,0.46)
 *   chip   — light rgba(0,0,0,0.03)       · dark rgba(0,0,0,0.10)
 *   action — rgba(163,149,255,0.50) + 1.6px white border (both themes)
 * backdropFilter stays INLINE (Lightning CSS strips it from stylesheets). */
/* Sprint 7.1 — extended-backdrop frosted glass, per
 * joshwcomeau.com/css/backdrop-filter (read in full):
 *   · the blur layer is a CHILD at height:200%, bottom-anchored so the
 *     filter samples content ABOVE the floating nav;
 *   · mask-image clips it back to the visible shape (never overflow:hidden
 *     or clip-path — Chrome applies those BEFORE the filter);
 *   · a thin lower-blur edge strip fakes the thick-glass rim;
 *   · both layers are pointer-events:none; the wrapper stays interactive;
 *   · @supports fallback (nav-glass.module.css) goes opaque.
 * DEVIATION from the earlier SVG-<mask> approach: WebKit does not resolve
 * CSS mask-image url(#inlineMask) on HTML elements, which left the
 * backdrops UNMASKED on iPhones — three frosted SQUARES (the "white band"
 * over Discover's bright photos). Shapes are now composed from pure
 * gradient mask layers (the article's own mechanism): a bottom-anchored
 * radial cap at each end + a connecting band, unioned. Works in Safari,
 * Chrome and Firefox. backdropFilter stays INLINE (Lightning CSS). */
const CAP = "radial-gradient(circle 28px at 28px 50%, black 98%, transparent 100%)";
const CAP_END = "radial-gradient(circle 28px at calc(100% - 28px) 50%, black 98%, transparent 100%)";
const BAND = "linear-gradient(to right, transparent 28px, black 28px, black calc(100% - 28px), transparent calc(100% - 28px))";
const SHAPE_MASK = {
  maskImage: `${CAP}, ${CAP_END}, ${BAND}`,
  WebkitMaskImage: `${CAP}, ${CAP_END}, ${BAND}`,
  maskSize: "100% 50%",
  WebkitMaskSize: "100% 50%",
  maskPosition: "bottom",
  WebkitMaskPosition: "bottom",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
} as const;

function GlassLayers({ tint }: { tint: string }) {
  return (
    <>
      {/* 200%-tall bottom-anchored blur layer, masked to the pill/circle.
          (A 56px-wide element's caps meet in the middle → a circle.) */}
      <div
        className={glass["nav-backdrop"]}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: tint,
          ...SHAPE_MASK,
        }}
      />
      {/* Glassy edge — smaller blur + brightness shift along the top rim. */}
      <div
        className={glass["nav-backdrop-edge"]}
        style={{
          backdropFilter: "blur(12px) brightness(1.15)",
          WebkitBackdropFilter: "blur(12px) brightness(1.15)",
          background: "var(--nav-edge)",
        }}
      />
    </>
  );
}

interface Tab { key: string; label: string; icon: LucideIcon; href: string }

export function DynamicBottomNav({
  tripId,
  destination = "",
  days = [],
  startDate,
  endDate,
  currency = "USD",
  budgetTotal = null,
}: {
  tripId: string;
  destination?: string;
  days?: string[];
  startDate: string;
  endDate: string;
  currency?: string;
  budgetTotal?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const base = `/trips/${tripId}`;
  const phase: TripPhase = tripPhase({ startDate, endDate });

  const [plusOpen, setPlusOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  // Sprint 4 FIX-5a: the document composer owned by the + menu.
  const [docOpen, setDocOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // Sprint 7 FIX-2 — the exact tab table:
  //   PLANNING  Now · Discover · Money
  //   LIVE      Today · Nearby · Money
  //   DEPARTURE Now · Pack · Discover
  //   RECAP     Now · Money (two tabs; the pill shrinks)
  const nowTab: Tab = {
    key: "now",
    label: phase === "LIVE" ? t("nav.today") : t("nav.now"),
    icon: phase === "LIVE" ? Navigation : phase === "DEPARTURE" ? PlaneTakeoff : phase === "RECAP" ? Sparkles : MapPin,
    href: base,
  };
  const discoverTab: Tab = {
    key: "discover",
    label: phase === "LIVE" ? t("nav.nearby") : t("nav.discover"),
    icon: Compass,
    href: `${base}/discover`,
  };
  const moneyTab: Tab = { key: "money", label: t("nav.money"), icon: Wallet, href: `${base}/money` };
  const packTab: Tab = { key: "pack", label: t("nav.pack"), icon: Luggage, href: `${base}/pack` };
  const tabs: Tab[] =
    phase === "RECAP"
      ? [nowTab, moneyTab]
      : phase === "DEPARTURE"
        ? [nowTab, packTab, discoverTab]
        : [nowTab, discoverTab, moneyTab];

  // Active tab = longest matching href; money-era routes count as Money.
  // No match (e.g. /members) → no chip.
  const moneyish = /^\/trips\/[^/]+\/(money|expenses|wallet)/.test(pathname);
  const activeKey = (() => {
    const match = [...tabs]
      .sort((a, b) => b.href.length - a.href.length)
      .find((tab) => (tab.href === base ? pathname === base : pathname.startsWith(tab.href)));
    if (match) return match.key;
    if (moneyish && tabs.some((tab) => tab.key === "money")) return "money";
    return "";
  })();

  const todayIso = isoFmt(new Date(), "yyyy-MM-dd");
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? "";

  // [+] behavior: single tap = phase default; long-press 400ms = full sheet.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function onPlusDown() {
    longPressed.current = false;
    // Sprint 7 FIX-3: long-press ALWAYS opens the + menu, on every screen.
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      setPlusOpen(true);
    }, 400);
  }
  function onPlusUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }
  function onPlusClick() {
    // FIX 1: click is the tap path — synthesized reliably on mobile even
    // with slight finger movement (pointerup is not). The contextual
    // right-circle action (`right.action`) covers every tab + phase.
    if (!longPressed.current) right.action();
  }
  function onPlusCancel() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

  // Sprint 7 FIX-3 — route flags drive both circles (screen-based, not
  // tab-based: /money in DEPARTURE has no Money tab but is still Money).
  const isPackPage = pathname === `${base}/pack`;
  const isMoneyPage = moneyish;
  const isDiscoverPage = pathname.startsWith(`${base}/discover`);
  const isItineraryPage = pathname.startsWith(`${base}/itinerary`);
  const [packInputOpen, setPackInputOpen] = useState(false);
  useEffect(() => setPackInputOpen(false), [pathname]);
  function togglePackInput() {
    setPackInputOpen((cur) => {
      dispatch(cur ? "pack:blurAdd" : "pack:focusAdd");
      return !cur;
    });
  }

  // LEFT circle — one job: get to the itinerary fast; on the itinerary,
  // flip home to the cockpit.
  const left: { icon: LucideIcon; label: string; action: () => void } = isItineraryPage
    ? { icon: House, label: phase === "LIVE" ? t("nav.today") : t("nav.now"), action: () => router.push(base) }
    : { icon: CalendarDays, label: t("nav.itinerary"), action: () => router.push(`${base}/itinerary`) };

  // RIGHT circle — the Sprint 7 scenario table. Long-press (below) always
  // opens the + menu regardless of screen.
  const right: { icon: LucideIcon; accent: boolean; label: string; action: () => void } = isPackPage
    ? {
        icon: packInputOpen ? X : Plus,
        accent: true,
        label: packInputOpen ? t("common.close") : t("pack.add"),
        action: togglePackInput,
      }
    : isDiscoverPage
    ? { icon: Search, accent: false, label: t("nav.search"), action: () => dispatch("discover:toggleSearch") }
    : isMoneyPage
      ? {
          // Phase-aware expense entry: typing pre-trip, camera on the ground.
          icon: phase === "LIVE" || phase === "RECAP" ? Camera : Plus,
          accent: true,
          label: t("nav.add"),
          action: () =>
            phase === "LIVE" || phase === "RECAP"
              ? router.push(`${base}/money/expense-camera`)
              : dispatch("paxawa:logExpense"),
        }
      : isItineraryPage
        ? { icon: Plus, accent: true, label: t("nav.addPlace"), action: () => dispatch("paxawa:addStop") }
        : phase === "LIVE"
          ? { icon: Camera, accent: true, label: t("nav.add"), action: () => router.push(`${base}/money/expense-camera`) }
          : { icon: Plus, accent: true, label: t("nav.add"), action: () => setPlusOpen(true) };

  return (
    <div className="xl:hidden">
      {/* Sprint 6 FIX-3 Layer A: content fades into the page background just
          above the nav, so lists scroll UNDER it instead of smashing against
          the edge. Purely visual (pointer-events none, z-39 under the z-40
          nav); var(--background) keeps both themes correct. The nav's glass
          itself (Layer B) is the existing inline backdropFilter + the
          semi-transparent --pill-bg tokens. */}
      {!isDiscoverPage && (
      <div
        aria-hidden
        className="fixed inset-x-0 z-[39]"
        style={{
          bottom: 0,
          height: 120,
          background: "linear-gradient(to bottom, transparent, var(--background))",
          pointerEvents: "none",
        }}
      />
      )}
      {/* Sprint 6 FIX-3 — Figma pill nav: [home 56] [12] [pill flex] [12]
          [action 56], all same height, separate floating glass elements. */}
      <div
        className="fixed inset-x-0 z-40 flex items-center justify-center gap-3"
        style={{ bottom: "env(safe-area-inset-bottom)", padding: "12px 16px", pointerEvents: "none" }}
      >
        {/* LEFT — itinerary shortcut (Sprint 7 FIX-3); on the itinerary it
            flips home to the cockpit. Extended-backdrop glass (FIX-4). */}
        <button
          type="button"
          onClick={left.action}
          aria-label={left.label}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 active:scale-95 ${glass["nav-element-circle"]}`}
          style={{ pointerEvents: "auto" }}
        >
          <GlassLayers tint="var(--nav-glass)" />
          <span key={`left-${left.label}`} className="relative" style={{ animation: "fadeIn 200ms ease" }}>
            <left.icon size={24} className="text-foreground" />
          </span>
        </button>

        {/* CENTER pill — equal-width tabs, icon over label. The Animate UI
            highlight is the active chip (rgba black at 3%/10% per theme);
            active icon is the filled variant (fill=currentColor). */}
        <Tabs
          value={activeKey}
          aria-label="Trip sections"
          className={`relative flex-1 min-w-0 max-w-[420px] flex items-center h-14 rounded-full ${glass["nav-element-pill"]}`}
          style={{ pointerEvents: "auto" }}
        >
          <GlassLayers tint="var(--nav-glass)" />
          <TabsHighlight
            className="rounded-full"
            transition={{ type: "spring", stiffness: 250, damping: 27 }}
            style={{ top: 4, bottom: 4, insetInlineStart: 4, insetInlineEnd: 4, background: "var(--nav-chip)" }}
          >
            <TabsList className="flex items-center w-full h-full px-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeKey;
                return (
                  <TabsHighlightItem key={tab.key} value={tab.key} className="flex-1 h-full min-w-0">
                    <Link
                      href={tab.href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      className="flex flex-col items-center justify-center gap-0.5 h-full w-full min-w-0"
                    >
                      {/* Icon morph at phase boundary: keyed crossfade. */}
                      <span key={`${tab.key}-${phase}`} style={{ animation: "fadeIn 200ms ease" }}>
                        <Icon
                          size={24}
                          className="text-foreground"
                          strokeWidth={2}
                          fill={active ? "currentColor" : "none"}
                        />
                      </span>
                      <span
                        className="truncate max-w-full px-1 text-foreground"
                        style={{ fontSize: "clamp(10px, 3vw, 12px)", fontWeight: 500, letterSpacing: "-0.02em" }}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  </TabsHighlightItem>
                );
              })}
            </TabsList>
          </TabsHighlight>
        </Tabs>

        {/* RIGHT — action circle: brand at 50% + white border (Figma), the
            contextual action unchanged (menu / camera / search / pack X). */}
        <button
          type="button"
          onClick={onPlusClick}
          onPointerDown={onPlusDown}
          onPointerUp={onPlusUp}
          onPointerCancel={onPlusCancel}
          onPointerLeave={onPlusCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={right.label}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 active:scale-95 ${glass["nav-element-circle-brand"]}`}
          style={{ border: "1.6px solid white", pointerEvents: "auto" }}
        >
          <GlassLayers tint="rgba(163, 149, 255, 0.50)" />
          <span key={`right-${right.label}-${phase}`} className="relative" style={{ animation: "fadeIn 200ms ease" }}>
            <right.icon size={24} className="text-black dark:text-white" />
          </span>
        </button>
      </div>

      {/* Full Add sheet — the long-press target; also the PLANNING/DEPARTURE
          tap default. DEPARTURE puts the pack row first (§3-A table). */}
      <BottomSheet open={plusOpen} onClose={() => setPlusOpen(false)} title={t("nav.addTitle")} size="sm">
        <div className="divide-y divide-border/60">
          {/* Sprint 4: every row produces something in ≤2 taps. The AI stub
              is gone (audit FIX-1 — no toast, no promise); pack opens a real
              composer (FIX-4); expenses are phase-aware (FIX-3: pre-trip you
              TYPE a deposit, on the ground you photograph a bill); Share
              dispatches the crew-sheet event every trip route listens for
              (FIX-2 — paxawa:shareTrip only had a LIVE listener); documents
              get their first entry point (FIX-5a). */}
          <ActionRow icon={MapPin} label={t("nav.addPlace")} onClick={() => { setPlusOpen(false); setAddPlaceOpen(true); }} />
          <ActionRow
            icon={Wallet}
            label={t("now.logExpense")}
            onClick={() => {
              setPlusOpen(false);
              router.push(phase === "PLANNING" ? `${base}/money?add=expense` : `${base}/money/expense-camera`);
            }}
          />
          <ActionRow icon={FileText} label={t("nav.addDocument")} onClick={() => { setPlusOpen(false); setDocOpen(true); }} />
          <ActionRow icon={Users} label={t("nav.askCrew")} onClick={() => { setPlusOpen(false); router.push(`${base}/huddle?compose=poll`); }} />
          <ActionRow icon={Share2} label={t("nav.shareTrip")} onClick={() => { setPlusOpen(false); dispatch("paxawa:openCrewSheet"); }} />
          <ActionRow icon={CalendarDays} label={t("nav.setBudget")} onClick={() => { setPlusOpen(false); setBudgetOpen(true); }} />
        </div>
      </BottomSheet>

      <AddPlaceSearch
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        tripId={tripId}
        destination={destination}
        destinationCenter={null}
        days={days}
        defaultDay={defaultDay}
      />
      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} tripId={tripId} currency={currency} total={budgetTotal} />
      {/* Sprint 4 FIX-5a: the documents entry point (controlled mode). */}
      <AddDocumentDialog tripId={tripId} open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
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

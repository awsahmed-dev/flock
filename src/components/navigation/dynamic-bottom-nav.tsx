"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, Compass, LayoutGrid, Wrench, Plus, Heart, Search,
  Map as MapIcon, MessageSquare, Wallet, Sparkles, MapPin, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/locale-provider";

/**
 * §9 — the Shopify-style dynamic bottom nav. The three centre tabs never
 * change; the left and right slots MORPH by active mode:
 *   NOW      → 🔧 Tools speed-dial (left) · + action sheet (right)
 *   DISCOVER → ❤ Saved (left, count badge) · 🔍 Search (right)
 *   MANAGE   → slots collapse; each MANAGE surface owns its own add UI
 *             (Pack's fixed add bar, Expenses' native add), so the three
 *             tabs expand to full width.
 *
 * Discover's Saved/Search reach into the feed via window CustomEvents (the feed
 * lives in a sibling route, not a child of this nav). Glass background uses an
 * INLINE backdrop-filter — the bundler strips it from stylesheets.
 */
const GLASS = {
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  transform: "translateZ(0)",
  willChange: "transform",
} as const;

const PILL_GLASS = {
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const;

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive: (p: string, b: string) => boolean;
}

export function DynamicBottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const base = `/trips/${tripId}`;

  const isNow = pathname === base;
  const isDiscover = pathname.startsWith(`${base}/discover`);
  const isBookings = pathname.startsWith(`${base}/wallet`);
  const mode: "now" | "discover" | "manage" | "other" = isNow
    ? "now"
    : isDiscover
      ? "discover"
      : /^\/trips\/[^/]+\/(manage|expenses|wallet|pack|members|settings)/.test(pathname)
        ? "manage"
        : "other";

  const [speedDial, setSpeedDial] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Close transient UI on navigation.
  useEffect(() => {
    setSpeedDial(false);
    setPlusOpen(false);
  }, [pathname]);

  // Discover wishlist count → the Saved badge (fed by the feed).
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

  const speedItems = [
    { icon: MapIcon, label: t("now.fullMap"), go: `${base}/itinerary` },
    { icon: MessageSquare, label: t("now.chat"), go: `${base}/chat` },
    { icon: Wallet, label: t("manage.expenses"), go: `${base}/expenses` },
  ];

  return (
    <div className="xl:hidden">
      {/* Speed-dial scrim — transparent so the map stays fully visible. */}
      {speedDial && (
        <button
          type="button"
          aria-hidden
          onClick={() => setSpeedDial(false)}
          className="fixed inset-0 z-40"
        />
      )}

      {/* Tools speed-dial — fans up from the left slot (bottom-most appears first). */}
      {speedDial && mode === "now" && (
        <div className="fixed z-50 start-3 bottom-[calc(60px+env(safe-area-inset-bottom)+14px)] flex flex-col-reverse gap-2">
          {speedItems.map((it, i) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                onClick={() => { setSpeedDial(false); router.push(it.go); }}
                style={{ ...PILL_GLASS, background: "rgba(10,10,10,0.92)", animationDelay: `${i * 50}ms` }}
                className="dyn-speed-item flex items-center gap-2.5 h-11 ps-3 pe-4 rounded-full text-white text-sm font-bold border-s-2 border-primary shadow-lg"
              >
                <Icon className="w-5 h-5" /> {it.label}
              </button>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Trip sections"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/75 pb-[env(safe-area-inset-bottom)]"
        style={GLASS}
      >
        {/* LEFT slot */}
        <Slot show={mode === "now" || mode === "discover"}>
          {mode === "now" && (
            <SlotButton
              onClick={() => setSpeedDial((v) => !v)}
              icon={Wrench}
              label={t("nav.tools")}
              rotated={speedDial}
            />
          )}
          {mode === "discover" && (
            <SlotButton
              onClick={() => dispatch("discover:openWishlist")}
              icon={Heart}
              label={t("discover.savedTitle")}
              badge={savedCount}
            />
          )}
        </Slot>

        {/* CENTRE — the three modes (never morph). */}
        {tabs.map((tab) => {
          const active = tab.isActive(pathname, base);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={`${base}${tab.href}`}
              prefetch
              aria-current={active ? "page" : undefined}
              className="flex-1 flex items-center justify-center h-[60px] min-w-[44px]"
            >
              <span
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 rounded-full transition-colors duration-200",
                  active ? "text-primary" : "text-tertiary hover:bg-[rgba(107,92,231,0.10)] active:bg-[rgba(107,92,231,0.10)]",
                )}
                style={active ? { background: "rgba(107, 92, 231, 0.18)" } : undefined}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[11px] font-semibold tracking-wide">{tab.label}</span>
              </span>
            </Link>
          );
        })}

        {/* RIGHT slot */}
        <Slot show={mode === "now" || mode === "discover"}>
          {mode === "now" && (
            <SlotButton onClick={() => setPlusOpen(true)} icon={Plus} label={t("nav.add")} accent />
          )}
          {mode === "discover" && (
            <SlotButton onClick={() => dispatch("discover:toggleSearch")} icon={Search} label={t("nav.search")} />
          )}
        </Slot>
      </nav>

      {/* NOW [+] action sheet (§9-D). */}
      <BottomSheet open={plusOpen} onClose={() => setPlusOpen(false)} title={t("nav.addTitle")} size="sm">
        <div className="divide-y divide-border/60">
          <ActionRow icon={MapPin} label={t("nav.addPlace")} onClick={() => { setPlusOpen(false); router.push(`${base}/discover`); }} />
          <ActionRow icon={Sparkles} label={t("nav.aiFillDay")} onClick={() => { setPlusOpen(false); router.push(`${base}/itinerary`); }} />
          <ActionRow icon={MessageSquare} label={t("nav.suggestCrew")} onClick={() => { setPlusOpen(false); router.push(`${base}/discover`); }} />
          <ActionRow icon={Wallet} label={t("now.logExpense")} onClick={() => { setPlusOpen(false); router.push(`${base}/expenses`); }} />
        </div>
      </BottomSheet>
    </div>
  );
}

/** A 56px side slot that collapses (width 0) when its mode has no slot content. */
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
      className="relative w-11 h-11 rounded-full flex items-center justify-center text-tertiary active:scale-95 transition-transform"
    >
      <span
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200",
          accent ? "bg-primary text-primary-foreground" : "text-foreground",
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

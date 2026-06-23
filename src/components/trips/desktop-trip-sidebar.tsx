"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  LayoutDashboard,
  MapPin,
  Compass,
  Gavel,
  Wallet,
  Backpack,
  Ticket,
  Bell,
  MessageSquare,
  Settings,
  Share2,
  Check,
  Calendar,
  Sun,
  Moon,
  Monitor,
  UserCircle,
  Keyboard,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useT } from "@/components/i18n/locale-provider";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * B27: persistent desktop trip sidebar. Replaces the top-bar +
 * sub-nav-tabs + bottom-nav stack on lg+ screens — that whole vertical
 * cluster of chrome was a mobile pattern stretched to fit desktop and
 * was the single biggest reason the app read as "code-vibed" on a
 * larger screen.
 *
 * Layout (lg+):
 *   - Logo + back-to-dashboard at top
 *   - Trip name + destination + dates as a card (context anchor)
 *   - Nav tabs as a vertical rail (Overview · Plan · Money · Bookings ·
 *     Pack · Votes), each with hover state + active indicator + badge
 *   - Chat / Notifications / More actions section
 *   - Account menu pinned at the bottom — avatar + name + dropdown for
 *     theme / sign-out / share / etc.
 *
 * Mobile is untouched: the existing top bar + bottom MobileNav + sub-nav
 * tabs still render at <lg. This component is `hidden lg:flex` only.
 */
interface Props {
  trip: {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    shareToken?: string | null;
  };
  isOwner: boolean;
  badges: { chat: number; itinerary: number; expenses: number; decisions: number };
  onChatOpen: () => void;
  onMoreOpen: () => void;
}

// P0-1: canonical taxonomy — one label + one icon per route, shared with
// every other nav surface. Plan (/itinerary), Money (/expenses, Wallet icon),
// Bookings (/wallet, Ticket icon — distinct from Money's wallet so an icon
// never means two destinations).
const NAV_TABS = [
  { key: "nav.overview", href: "", icon: LayoutDashboard, badgeKey: null as null },
  { key: "nav.itinerary", href: "/itinerary", icon: MapPin, badgeKey: "itinerary" as const },
  { key: "nav.discover", href: "/discover", icon: Compass, badgeKey: null as null },
  { key: "nav.decisions", href: "/decisions", icon: Gavel, badgeKey: "decisions" as const },
  { key: "nav.expenses", href: "/expenses", icon: Wallet, badgeKey: "expenses" as const },
  { key: "nav.wallet", href: "/wallet", icon: Ticket, badgeKey: null as null },
  { key: "nav.pack", href: "/pack", icon: Backpack, badgeKey: null as null },
];

export function DesktopTripSidebar({
  trip,
  isOwner,
  badges,
  onChatOpen,
  onMoreOpen,
}: Props) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [shareCopied, setShareCopied] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    displayName: string;
    avatarUrl: string | null;
  }>({ displayName: "", avatarUrl: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setMyProfile({
        displayName: profile?.display_name ?? user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function copyShare() {
    if (!trip.shareToken) return;
    const url = `${window.location.origin}/share/${trip.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-64 z-40 bg-card border-e border-border/60 flex-col">
      {/* Top — logo + back to dashboard */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground"
          aria-label="Paxawa — back to all trips"
        >
          <Logo variant="full" size="sm" />
        </Link>
        <Link
          href="/dashboard"
          prefetch
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3"
        >
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          {t("nav.backToTrips")}
        </Link>
      </div>

      {/* P1-4: slimmed trip context. Was a gradient hero panel restating
          name/destination/dates with full chrome in a persistent rail —
          chrome out of proportion to the info. Now a quiet two-line block:
          trip name + "destination · dates" on one line, no gradient card. */}
      <div className="px-4 pt-3 pb-3 border-b border-border/40">
        <p className="font-bold text-sm leading-snug line-clamp-1">{trip.name}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5 tabular-nums">
          {trip.destination} · {format(parseDateOnly(trip.startDate), "d MMM")} –{" "}
          {format(parseDateOnly(trip.endDate), "d MMM")}
        </p>
      </div>

      {/* Nav tabs */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_TABS.map((tab) => {
          const href = `/trips/${trip.id}${tab.href}`;
          const isActive =
            tab.href === ""
              ? pathname === `/trips/${trip.id}`
              : pathname.startsWith(href);
          const badge = tab.badgeKey ? badges[tab.badgeKey] : 0;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={href}
              prefetch
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform shrink-0",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/80 group-hover:scale-110",
                )}
              />
              <span className="flex-1">{t(tab.key)}</span>
              {badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-border/40 my-2 mx-2" />

        {/* Secondary actions */}
        <button
          type="button"
          onClick={onChatOpen}
          className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-muted-foreground/80 group-hover:scale-110 transition-transform shrink-0" />
          <span className="flex-1 text-start">{t("chat.chat")}</span>
          {badges.chat > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {badges.chat > 99 ? "99+" : badges.chat}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onMoreOpen}
          className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <Settings className="w-4 h-4 text-muted-foreground/80 group-hover:scale-110 transition-transform shrink-0" />
          <span className="flex-1 text-start">{t("nav.tripSettings")}</span>
        </button>
        {trip.shareToken && (
          <button
            type="button"
            onClick={copyShare}
            className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            {shareCopied ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Share2 className="w-4 h-4 text-muted-foreground/80 group-hover:scale-110 transition-transform shrink-0" />
            )}
            <span className="flex-1 text-start">
              {shareCopied ? t("common.copied") : t("trip.copyInvite")}
            </span>
          </button>
        )}
        <a
          href={`/api/trips/${trip.id}/calendar.ics`}
          download
          className="group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <Calendar className="w-4 h-4 text-muted-foreground/80 group-hover:scale-110 transition-transform shrink-0" />
          <span className="flex-1 text-start">{t("nav.addToCalendar")}</span>
        </a>
      </nav>

      {/* Account menu — pinned bottom */}
      <div className="border-t border-border/40 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted/60 transition-colors text-start">
                <UserAvatar
                  name={myProfile.displayName || "Me"}
                  avatarUrl={myProfile.avatarUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">
                    {myProfile.displayName || "Me"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {t("nav.accountMenu")}
                  </p>
                </div>
                <Bell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="start" side="top" className="w-56 mb-2">
            <DropdownMenuItem
              render={<Link href="/account/profile" />}
              className="gap-2"
            >
              <UserCircle className="w-4 h-4" />
              {t("profile.menuLink")}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/account/notifications" />}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              {t("nav.notificationSettings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-2"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="gap-2"
              disabled={theme === "system"}
            >
              <Monitor className="w-4 h-4" />
              {t("nav.matchSystem")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent("paxawa:shortcuts:show"),
                )
              }
              className="gap-2"
            >
              <Keyboard className="w-4 h-4" />
              {t("nav.keyboardShortcuts")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Owner hint — when not owner, settings entry stays available via
            More button above, so we don't need to redundantly show it here. */}
        {void isOwner}
      </div>
    </aside>
  );
}

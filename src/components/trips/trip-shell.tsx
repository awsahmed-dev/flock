"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  LayoutDashboard,
  UserCircle,
  Settings,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { parseDateOnly } from "@/lib/date-only";
import { BottomTabBar } from "@/components/trips/bottom-tab-bar";
import { DesktopModeNav } from "@/components/trips/desktop-mode-nav";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  shareToken?: string | null;
}

interface Props {
  trip: Trip;
  userId: string;
  isOwner: boolean;
  children: React.ReactNode;
}

/**
 * Reinvention shell (redesign brief §2). A single thin top bar + the three-mode
 * bottom tab bar on mobile, with the 280px desktop sidebar at ≥xl. The old
 * multi-tab sidebar, mobile floating nav, chat side-panel, crew sheet, tools
 * sheet, notification bell and keyboard-shortcut layer are all gone — chat is a
 * full page reached by route, crew/sharing live in Settings.
 *
 * Top bar: left = trip name on a mode root, a back arrow on any deeper view;
 * right = avatar → account menu. Titles are left-aligned; no centered titles,
 * no hamburger, no drawer.
 */
export function TripShell({ trip, isOwner, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<{ name: string; avatarUrl: string | null }>({
    name: "",
    avatarUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile({
        name: data?.display_name ?? user.email ?? "",
        avatarUrl: data?.avatar_url ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const base = `/trips/${trip.id}`;
  // Mode roots show the trip name; anything deeper shows a back affordance.
  const isModeRoot =
    pathname === base ||
    pathname === `${base}/discover` ||
    pathname === `${base}/expenses`;
  // Immersive screens have no shell top bar and fill the viewport: Discover
  // (Screen D) and the NOW cockpit (Screen C, the trip root — full-screen map
  // + its own draggable sheet). They carry their own controls.
  const started = parseDateOnly(trip.startDate) <= new Date();
  const isDiscover = pathname.startsWith(`${base}/discover`);
  const immersive = pathname === base || isDiscover;
  // Dark-chrome routes render the WHOLE shell dark (header + body + tab bar).
  // Discover and the Full Map are always dark; the trip root and Chat go dark
  // only while the trip is ACTIVE (started). An upcoming trip's root shows the
  // LIGHT pre-start overview and its Chat stays light — so we must NOT blanket-
  // dark every immersive route (that was darkening the pre-start briefing).
  const darkChrome =
    isDiscover ||
    pathname === `${base}/itinerary` ||
    (started && pathname === base) ||
    (started && pathname === `${base}/chat`);

  // 0-B / 0-C: the `dark` class on our root flips descendant tokens, but the
  // <body> element is our ANCESTOR — its own background stays light, so
  // `getComputedStyle(document.body)` reads white on dark pages. Set it
  // explicitly on dark-chrome routes and restore it when leaving.
  useEffect(() => {
    if (!darkChrome) return;
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#0a0a0a";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [darkChrome]);

  return (
    <div className={`min-h-svh flex flex-col bg-background text-foreground ${darkChrome ? "dark" : ""}`}>
      <DesktopModeNav tripId={trip.id} tripName={trip.name} />

      <div className="flex flex-col min-h-svh xl:ps-[280px]">
        {/* Top bar — 52px, left-aligned, avatar right (brief §2.2). Hidden on
            the immersive Discover screen. */}
        {!immersive && (
        <header className="h-[52px] shrink-0 flex items-center justify-between gap-3 px-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-1.5 min-w-0">
            {isModeRoot ? (
              <Link
                href="/dashboard"
                aria-label="All trips"
                className="xl:hidden -ms-2 flex items-center justify-center w-11 h-11 rounded-full text-foreground hover:opacity-70"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Back"
                className="-ms-2 flex items-center justify-center w-11 h-11 rounded-full text-foreground hover:opacity-70"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
            )}
            <p className="font-bold text-[15px] truncate max-w-[60vw]">{trip.name}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full shrink-0 tap-target flex items-center justify-center" title={profile.name || "Account"}>
                  <UserAvatar name={profile.name || "Me"} avatarUrl={profile.avatarUrl} size="md" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem render={<Link href="/dashboard" />} className="gap-2">
                <LayoutDashboard className="w-4 h-4" /> All trips
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/account/profile" />} className="gap-2">
                <UserCircle className="w-4 h-4" /> Profile
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem render={<Link href={`${base}/settings`} />} className="gap-2">
                  <Settings className="w-4 h-4" /> Trip settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="gap-2"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        )}

        {/* Screen content. Bottom padding clears the fixed tab bar on mobile;
            the desktop sidebar handles its own offset above. Discover is
            immersive — it manages its own full-height + tab-bar clearance. */}
        <main className={immersive ? "flex-1 min-w-0" : "flex-1 min-w-0 pb-[calc(60px+env(safe-area-inset-bottom))] xl:pb-0"}>
          {children}
        </main>

        <BottomTabBar tripId={trip.id} />
      </div>
    </div>
  );
}

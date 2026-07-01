"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  UserCircle,
  Bell,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useT } from "@/components/i18n/locale-provider";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * B27: persistent dashboard sidebar — same structural pattern as
 * DesktopTripSidebar but for the /dashboard + /account + /trips/new
 * surfaces. On lg+ replaces the top header bar's role as nav. Mobile
 * (< lg) keeps the existing DashboardShell top header.
 *
 * Sections:
 *   - Logo + headline
 *   - Primary nav: Dashboard · New trip · Blog (marketing) — these are
 *     the things a signed-in user actually clicks between, not all the
 *     marketing surfaces
 *   - Account menu pinned at bottom
 */
interface Props {
  displayName: string;
  avatarUrl: string | null;
  userId: string;
}

export function DesktopDashboardSidebar({
  displayName,
  avatarUrl,
  userId: _userId,
}: Props) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const NAV = [
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { href: "/trips/new", icon: Plus, label: t("dashboard.newTrip"), accent: true },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-64 z-40 bg-card border-e border-border/60 flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground"
          aria-label="Paxawa"
        >
          <Logo variant="full" size="sm" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          if (item.accent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity mb-1.5"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <Sparkles className="w-3.5 h-3.5 opacity-70" />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
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
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        <div className="h-px bg-border/40 my-3 mx-2" />

        <Link
          href="/account/notifications"
          className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <Bell className="w-4 h-4 text-muted-foreground/80 group-hover:scale-110 transition-transform shrink-0" />
          <span className="flex-1">{t("nav.notificationSettings")}</span>
        </Link>
      </nav>

      <div className="border-t border-border/40 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted/60 transition-colors text-start">
                <UserAvatar
                  name={displayName || "Me"}
                  avatarUrl={avatarUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">
                    {displayName || "Me"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {t("nav.accountMenu")}
                  </p>
                </div>
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
      </div>
    </aside>
  );
}

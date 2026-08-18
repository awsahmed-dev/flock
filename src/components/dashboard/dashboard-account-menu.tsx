"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { UserCircle, Bell, SignOut as LogOut, Globe, Sun, Moon } from "@phosphor-icons/react/dist/ssr";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AccountSheet } from "@/components/account/account-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

/**
 * B24: account/profile menu lifted out of the trip-shell dropdown so
 * app-wide settings live where they belong — on the main dashboard. Was
 * previously buried inside each trip's top-right avatar (only reachable
 * after opening a trip, which is the wrong place for app preferences).
 */
interface Props {
  displayName: string;
  avatarUrl: string | null;
  userId: string;
  email?: string | null;
}

export function DashboardAccountMenu({ displayName, avatarUrl, userId, email = null }: Props) {
  void userId;
  const t = useT();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  // §2-C: on mobile the avatar opens the Account bottom sheet instead of the
  // desktop dropdown.
  const [sheetOpen, setSheetOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/login");
  }

  return (
    <div ref={ref} className="relative">
      {/* Mobile: avatar → Account bottom sheet (§2-C). */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="xl:hidden rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all"
        aria-label={displayName}
      >
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
      </button>

      {/* Desktop: avatar → dropdown menu. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hidden xl:block rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all"
        aria-label={displayName}
      >
        <UserAvatar
          name={displayName}
          avatarUrl={avatarUrl}
          size="md"
        />
      </button>

      <AccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        email={email}
      />
      {open && (
        <div className="absolute end-0 top-full mt-2 w-60 rounded-2xl bg-card border border-border shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">{t("profile.menuLink")}</p>
          </div>
          <Link
            href="/account/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted/60 transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            {t("profile.menuLink")}
          </Link>
          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted/60 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {t("nav.notificationSettings")}
          </Link>
          {/* Theme switcher inline — tiny 3-button row */}
          <div className="flex items-center gap-1 px-3 py-2 border-y border-border/60 my-1">
            <Globe className="w-4 h-4 text-muted-foreground me-1" />
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-1 rounded ${theme === "light" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-1 rounded ${theme === "dark" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DesktopDashboardSidebar } from "@/components/dashboard/desktop-dashboard-sidebar";

interface Props {
  children: React.ReactNode;
  /**
   * B24-followup: profile/account menu rendered in the top-right of the
   * global header on mobile. The desktop sidebar uses its own account
   * menu at the bottom-left, so when the desktop sidebar shows, this
   * prop only matters under lg.
   */
  accountMenu?: React.ReactNode;
  /**
   * B27: user info for the desktop sidebar. When present, a persistent
   * left rail renders on lg+ and the mobile top header hides on lg+.
   * When omitted (sub-pages that don't fetch user info), no sidebar
   * shows and the mobile header still renders on desktop as a fallback.
   */
  user?: {
    displayName: string;
    avatarUrl: string | null;
    userId: string;
  };
}

export function DashboardShell({ children, accountMenu, user }: Props) {
  return (
    <div className={`min-h-screen bg-background ${user ? "lg:ps-64" : ""}`}>
      {user && (
        <DesktopDashboardSidebar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          userId={user.userId}
        />
      )}
      <header
        className={`border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40 ${
          user ? "lg:hidden" : ""
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center text-foreground shrink-0"
            aria-label="Paxawa dashboard"
          >
            <Logo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {accountMenu}
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 pb-16 lg:py-10">
        {children}
      </main>

      <FeedbackWidget />
    </div>
  );
}

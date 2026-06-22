"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, ArrowRight } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

/**
 * P6 — offline fallback. next-pwa serves this document when the user navigates
 * to a route that isn't in the cache while offline. Pages they've already
 * opened (their trips, the dashboard) are cached by the SW and render normally;
 * this is the friendly "you went somewhere we don't have saved" screen.
 */
export default function OfflinePage() {
  const t = useT();
  return (
    <div className="min-h-[100svh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <WifiOff className="w-7 h-7" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">{t("offline.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("offline.body")}</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white px-4 py-3 text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            {t("offline.retry")}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl ring-1 ring-border/70 bg-card hover:bg-muted/50 px-4 py-3 text-sm font-bold transition-colors"
          >
            {t("offline.backToTrips")}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}

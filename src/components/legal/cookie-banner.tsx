"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "@phosphor-icons/react/dist/ssr";
import {
  setAnalyticsConsent,
  hasAnalyticsConsent,
} from "@/lib/analytics/posthog-client";

/**
 * Minimal, privacy-default cookie banner. Three states:
 *   - never-decided → banner shown
 *   - "granted"    → PostHog loads, banner hidden
 *   - "denied"     → PostHog stays off, banner hidden
 *
 * Decided state lives in localStorage (`paxawa:analytics-consent`). Re-shown
 * only if the user clears storage or signs in on a new device.
 *
 * Doesn't block render — pops in with a slight delay so the page is
 * usable instantly. Bottom-right card, dismissible, no scroll lock, no
 * dark overlay. Anything more aggressive than this fights the user.
 */

const CONSENT_KEY = "paxawa:analytics-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If they've already decided, don't show.
    if (typeof window === "undefined") return;
    try {
      const decided = localStorage.getItem(CONSENT_KEY);
      if (decided === "granted" || decided === "denied") return;
    } catch {
      // ignore
    }
    // Tiny delay so first paint isn't cluttered.
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  function decide(granted: boolean) {
    setAnalyticsConsent(granted);
    setVisible(false);
    // Force a soft reload so the PostHogProvider can re-init with the
    // new consent state. Cheaper than reaching across components.
    if (granted && !hasAnalyticsConsent()) {
      // hasAnalyticsConsent reads localStorage; in StrictMode there can be
      // a tick of staleness, so we just refresh to be safe.
      window.location.reload();
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4"
    >
      <button
        onClick={() => decide(false)}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Decline analytics"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Cookie className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p id="cookie-banner-title" className="text-sm font-bold">
            Help us build a better product?
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            We'd like to track anonymous usage events (signup, trip created,
            vote opened) to understand what works. Never reads your trip
            content. See our{" "}
            <Link
              href="/privacy"
              className="text-primary hover:underline font-medium"
            >
              privacy policy
            </Link>
            .
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => decide(true)}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold px-3 py-2 hover:opacity-90 transition-opacity"
            >
              Allow
            </button>
            <button
              onClick={() => decide(false)}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground text-xs font-bold px-3 py-2 hover:bg-muted/60 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

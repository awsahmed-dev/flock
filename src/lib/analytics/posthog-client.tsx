"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";

/**
 * PostHog wiring with consent + identity:
 *
 *   - Gated by a localStorage flag set by the cookie banner. Until the user
 *     accepts, posthog is never initialized — no requests, no cookies.
 *   - Once initialized, listens to Supabase auth state and calls
 *     posthog.identify(userId) so events tie to a stable user across sessions.
 *   - Silent no-op if NEXT_PUBLIC_POSTHOG_KEY is unset, so the deploy is
 *     safe even before you create a PostHog project.
 *
 * Use `import posthog from "posthog-js"` anywhere in the app to capture
 * an event — it'll be queued if consent isn't granted yet and dropped if
 * the key isn't set. We don't auto-capture pageviews; events are explicit
 * (see lib/analytics/events.ts).
 */

const CONSENT_KEY = "paxawa:analytics-consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
  } catch {
    // ignore
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (!key) return;
    if (!hasAnalyticsConsent()) return;
    if ((posthog as any).__loaded) return;

    posthog.init(key, {
      api_host: host,
      // Explicit events only — no automatic pageview / autocapture firehose.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      // Don't write a cookie until consent is granted (it already is, here,
      // but belt-and-braces).
      persistence: "localStorage",
      person_profiles: "identified_only",
      loaded: () => {
        // Identify the user once posthog is up. We only send the user id,
        // never email or name — matches privacy policy.
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
          if (data.user?.id) posthog.identify(data.user.id);
        });
      },
    });

    // Re-identify when the auth session changes (sign in / sign out).
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        posthog.identify(session.user.id);
      } else {
        posthog.reset();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Provider client={posthog}>{children}</Provider>;
}

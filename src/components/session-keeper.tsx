"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Proactive session keeper.
 *
 * Supabase-js already silently rotates the access token every ~50 minutes
 * while a page is alive. The hole: when a user closes the tab (or the iOS
 * PWA is suspended) past the access-token expiry, the next open hits a
 * brief window where the cookie still encodes an expired access token —
 * server components see `user = null` and the proxy redirects to login.
 *
 * On focus / visibility-change, ask supabase-js to refresh now. The library
 * deduplicates concurrent refreshes, so this is safe to fire freely. If
 * the refresh token has expired too (>1y of inactivity), supabase signs
 * out cleanly — there's nothing better we can do.
 */

export function SessionKeeper() {
  useEffect(() => {
    const supabase = createClient();

    let cancelled = false;

    async function refreshIfStale() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) return;
        const expiresAt = data.session?.expires_at;
        // expires_at is seconds since epoch. Refresh if within 5 min of expiry.
        if (!expiresAt) return;
        const remainingSec = expiresAt - Math.floor(Date.now() / 1000);
        if (remainingSec < 5 * 60) {
          await supabase.auth.refreshSession().catch(() => {
            /* refresh-token-expired → next nav routes to /auth/login. */
          });
        }
      } catch {
        // network blip — best-effort
      }
    }

    // First pass — usually no-op (page just loaded means session is fresh).
    refreshIfStale();

    function onFocus() {
      refreshIfStale();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") refreshIfStale();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}

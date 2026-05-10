"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Attaches the current Supabase user's id to every Sentry event so a
 * captured exception can be tied back to "which user hit it." Stays
 * privacy-conscious: only the user id is sent, no email or display name.
 *
 * Lives in Providers (root) so every page benefits without prop-drilling.
 * Silent no-op when NEXT_PUBLIC_SENTRY_DSN is unset (which is the default).
 */
export function SentryUserContext() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const supabase = createClient();

    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        Sentry.setUser({ id: user.id });
      } else {
        Sentry.setUser(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

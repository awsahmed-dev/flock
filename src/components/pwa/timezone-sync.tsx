"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE, isTimeZone } from "@/lib/today";

/**
 * Tells the server which calendar the traveller is actually living in.
 *
 * Without this, `getToday()` always falls back to UTC and every fix in
 * `fix/tz` is inert — correct, but correct about the wrong zone. This is the
 * one component that closes the loop.
 *
 * WHY A COOKIE, AND WHY NOT A SERVER ACTION
 *
 * The server has to know the zone BEFORE it renders, and the only channel that
 * arrives with the request is a cookie. `paxawa_locale` already works exactly
 * this way (`lib/i18n/index.ts:getLocale`, `lib/actions/set-locale.ts`), and
 * that cookie is deliberately not httpOnly, so we write this one from the
 * client directly — no server action, no round trip, no revalidation storm.
 *
 * WHY router.refresh() IS SAFE HERE
 *
 * It fires only when the stored zone differs from the live one, which means:
 *   - once, on a device's first ever visit (before that, the server assumed UTC
 *     — i.e. exactly the old behaviour, so nothing regresses); and
 *   - when the traveller actually changes zone, which for this app means they
 *     just landed. Re-rendering into the destination's calendar on arrival is
 *     the feature, not a side effect.
 *
 * It does NOT fire on every mount, so this is not a render loop.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It doesn't write to `profiles`. Server-only flows (the digest cron, push
 * payloads, pre-trip nudges) all still fire on a UTC schedule and still need a
 * per-user zone to be correct — that's a separate change with a schema column
 * behind it, and it is listed in `docs/timezone-model.md` rather than smuggled
 * in here.
 */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return; // no Intl data — leave the server on its UTC fallback
    }
    if (!isTimeZone(zone)) return;

    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);

    if (current === zone) return;

    // 1 year, path "/", lax — mirrors the locale cookie.
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Re-render the current route now that the server can answer "what day is
    // it?" correctly. Without this the first visit stays on UTC until the
    // traveller navigates.
    router.refresh();
  }, [router]);

  return null;
}

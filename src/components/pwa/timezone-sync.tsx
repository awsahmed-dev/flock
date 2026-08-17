"use client";

import { useEffect, useRef } from "react";
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
/**
 * Read a cookie value that MIGHT be percent-encoded by an older deploy.
 * decodeURIComponent throws on a malformed sequence, so it is guarded.
 */
function decodeCookie(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function TimeZoneSync() {
  const router = useRouter();

  // Refresh at most once per mount, no matter what. A belt to the braces below:
  // if the cookie comparison ever fails again for a reason I have not thought
  // of, the cost is one wasted refresh, not an unbounded loop.
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshed.current) return;

    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return; // no Intl data — leave the server on its UTC fallback
    }
    if (!isTimeZone(zone)) return;

    const raw = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);

    // Decode before comparing. THE BUG THIS FIXES, and it was severe:
    //
    // This used to write `encodeURIComponent(zone)` and compare the RAW cookie
    // value against the un-encoded zone. Every IANA zone except "UTC" contains a
    // "/", so the stored value was "Asia%2FRiyadh" and the comparison against
    // "Asia/Riyadh" could never be true. Two consequences, both shipped:
    //
    //   1. router.refresh() fired on every mount, forever — an unbounded
    //      refresh loop on every page for every non-UTC user.
    //   2. the server read "Asia%2FRiyadh", `isTimeZone()` rejected "%" as an
    //      illegal character, and getTimeZone() fell back to UTC — so the whole
    //      of fix/tz did nothing at all in production.
    //
    // It passed every test because the unit tests never touch this seam and
    // every render capture set the cookie RAW through Playwright's cookie API,
    // bypassing this component entirely.
    const current = decodeCookie(raw);
    if (current === zone) return;

    // Write it RAW. IANA zone names are letters, digits, "/", "_", "-" and "+",
    // all of which are legal cookie-octets (RFC 6265 excludes ";", ",",
    // whitespace, quotes and backslash — none of which appear in a zone name).
    // Encoding bought nothing and cost correctness.
    // 1 year, path "/", lax — mirrors the locale cookie.
    document.cookie = `${TZ_COOKIE}=${zone}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    refreshed.current = true;

    // Re-render the current route now that the server can answer "what day is
    // it?" correctly. Without this the first visit stays on UTC until the
    // traveller navigates.
    router.refresh();
  }, [router]);

  return null;
}

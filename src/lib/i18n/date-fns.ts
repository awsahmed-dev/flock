/**
 * B15-d: date-fns locale wrapper. Most of the app does
 * `format(parseDateOnly(s), "MMM d")` — without a locale that always
 * renders English. We can't import the ar locale at every call site
 * (boilerplate explosion), so this module re-exports thin wrappers
 * that pull the locale from a module-level state set by the root
 * layout.
 *
 * The state lives in module scope (not React context) because:
 *   - server components don't have access to React context
 *   - the dictionary already comes from a cookie that's stable
 *     within a render
 *   - format() is called from utility code that isn't a component
 *
 * On the server: setActiveLocale runs once per request via the layout.
 * On the client: setActiveLocale runs once after hydration via the
 *   LocaleProvider effect.
 */

import { ar, enUS } from "date-fns/locale";
import {
  format as fnsFormat,
  formatDistanceToNow as fnsFormatDistanceToNow,
  type FormatOptions,
  type FormatDistanceToNowOptions,
} from "date-fns";

type LocaleId = "en" | "ar";

const LOCALES = { en: enUS, ar } as const;

let active: LocaleId = "en";

export function setActiveLocale(locale: LocaleId) {
  active = locale;
}

export function getActiveLocale(): LocaleId {
  return active;
}

/**
 * Arabic writes dates differently, and date-fns's `ar` locale only
 * translates the words — it still obeys the pattern's English shape. Call
 * sites all over the app pass patterns like "EEE, MMM d", which rendered as
 * «أربعاء, سبتمبر 30»: no definite article, month before day, Latin comma.
 * A native reader reported all three as "not words".
 *
 * Rewriting the pattern here fixes every screen at once, instead of asking
 * a hundred call sites to know about Arabic.
 */
function arabicPattern(p: string): string {
  return (
    p
      // «أربعاء» is a bare noun; the day of the week is «الأربعاء». date-fns
      // puts the article on the full form only.
      .replace(/(?<!E)EEE(?!E)/g, "EEEE")
      // Day before month.
      .replace(/\bMMMM(\s+)d\b/g, "d MMMM")
      .replace(/\bMMM(\s+)d\b/g, "d MMM")
      // Arabic drops the comma before a year, and uses «،» elsewhere.
      .replace(/,\s*yyyy/g, " yyyy")
      .replace(/,\s/g, "، ")
  );
}

/**
 * Format with an EXPLICIT locale — the only safe option on the server.
 *
 * `active` is module state, and module state on the server is shared by
 * every concurrent request. Under streaming, one request can overwrite it
 * while another is still rendering, so an Arabic page could serialise an
 * English date — which is exactly what a tester saw on her trip home
 * ("Tbilisi · Thu 24 Sep" inside an otherwise Arabic screen) and is also
 * what produced the hydration mismatch, because the client re-rendered the
 * same date correctly.
 *
 * Client components are fine with `format` — their module graph is
 * per-browser, and LocaleProvider sets it during render. SERVER components
 * must use this and pass the locale they resolved for the request.
 */
export function formatWith(
  localeId: LocaleId,
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  return fnsFormat(date, localeId === "ar" ? arabicPattern(formatStr) : formatStr, {
    locale: LOCALES[localeId],
    ...options,
  });
}

/**
 * Drop-in replacement for date-fns `format`. Always passes the active
 * locale unless a caller explicitly overrides it via `options.locale`.
 */
export function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  const localeId: LocaleId = options?.locale === LOCALES.en ? "en" : active;
  return fnsFormat(date, localeId === "ar" ? arabicPattern(formatStr) : formatStr, {
    locale: LOCALES[active],
    ...options,
  });
}

export function formatDistanceToNow(
  date: Date | number,
  options?: FormatDistanceToNowOptions,
): string {
  return fnsFormatDistanceToNow(date, {
    locale: LOCALES[active],
    ...options,
  });
}

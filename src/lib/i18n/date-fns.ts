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
 * Drop-in replacement for date-fns `format`. Always passes the active
 * locale unless a caller explicitly overrides it via `options.locale`.
 */
export function format(
  date: Date | number,
  formatStr: string,
  options?: FormatOptions,
): string {
  return fnsFormat(date, formatStr, {
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

/**
 * B15: app i18n. Server-first dictionary load, cookie-based locale
 * negotiation, ICU-shaped placeholder + plural interpolation.
 *
 * Architecture decision: we keep the URL structure intact and store
 * the locale in a cookie rather than moving every route under
 * `/[lang]/...`. The app is already in production with stable URLs,
 * invite tokens, shared share-links, and a service worker cache —
 * forking every route to support a `lang` segment would break all of
 * them. SEO loss is acceptable because Paxawa is behind-auth; only
 * the marketing surfaces (/, /privacy, /terms) would benefit from
 * crawlable per-locale URLs, and those can opt into `/ar/` later.
 *
 * The dictionary is loaded server-side and passed down via a Client
 * Component Provider, so client components don't pay for the JSON
 * bundle twice — only the current locale's strings are shipped.
 */

import "server-only";
import { cookies, headers } from "next/headers";
import en from "./messages/en.json";
import ar from "./messages/ar.json";

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "paxawa_locale";

const DICTIONARIES = { en, ar } as const;
export type Dictionary = typeof en;

/**
 * Resolve the active locale.
 *   1. explicit cookie set by the language switcher → win
 *   2. Accept-Language header on first visit → sniff
 *   3. fallback to DEFAULT_LOCALE
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  // Cheap parse — we don't need a full RFC 4647 matcher; we only
  // support two languages and want the first match.
  const prefer = accept
    .split(",")
    .map((s) => s.trim().split(";")[0].split("-")[0].toLowerCase())
    .find(isLocale);
  return prefer ?? DEFAULT_LOCALE;
}

export function isLocale(s: string | undefined): s is Locale {
  return s === "en" || s === "ar";
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

/**
 * Look up a dotted key in the dictionary and substitute {placeholder}
 * tokens with the provided params. Returns the key itself on miss so
 * untranslated strings are at least visible in production.
 *
 * Supports a minimal ICU plural form:
 *   "{count, plural, one {1 thing} other {# things}}"
 * Used for the Arabic plural categories (zero/one/two/few/many/other).
 */
export function tFromDict(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const raw = lookup(dict, key);
  if (raw == null) return key;
  return interpolate(raw, params ?? {}, locale);
}

function lookup(dict: unknown, key: string): string | null {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

const PLURAL_RE =
  /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g;

function interpolate(
  template: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  // First pass: ICU plural blocks. Match each block and replace it
  // with the branch that fits the param's plural category.
  const afterPlurals = template.replace(
    PLURAL_RE,
    (_match, name: string, cases: string) => {
      const value = Number(params[name]);
      const category = pluralCategory(value, locale);
      const branches: Record<string, string> = {};
      const branchRe = /(\w+)\s*\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = branchRe.exec(cases)) !== null) {
        branches[m[1]] = m[2];
      }
      const chosen =
        branches[category] ?? branches.other ?? branches.one ?? "";
      // `#` inside a branch is the numeric value.
      return chosen.replace(/#/g, String(value));
    },
  );

  // Second pass: simple {name} placeholders.
  return afterPlurals.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}

/**
 * Best-effort plural category. For en + ar we use Intl.PluralRules,
 * with a small in-memory cache because constructing PluralRules is
 * non-trivial on each call.
 */
const pluralCache = new Map<Locale, Intl.PluralRules>();
function pluralCategory(n: number, locale: Locale): string {
  let pr = pluralCache.get(locale);
  if (!pr) {
    pr = new Intl.PluralRules(locale);
    pluralCache.set(locale, pr);
  }
  return pr.select(n);
}

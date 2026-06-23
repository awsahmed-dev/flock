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

// Matches the OPENING of an ICU plural block: `{ name , plural ,`. We then walk
// balanced braces ourselves to find the block end and the branch bodies — a
// regex can't, because Arabic two/few/many branches embed `{count}`/`{currency}`
// (nested braces) which broke the old `\{[^}]*\}` body match and leaked the raw
// ICU skeleton to the user. Branch keys may be a category (one/two/few/many/
// zero/other) or an exact match (`=0`).
const PLURAL_OPEN_RE = /^\{\s*(\w+)\s*,\s*plural\s*,/;

function interpolate(
  template: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  // First pass: ICU plural blocks, brace-aware so nested placeholders survive.
  const afterPlurals = replacePluralBlocks(template, params, locale);
  // Second pass: simple {name} placeholders (incl. any inside the chosen branch).
  return afterPlurals.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}

/** Scan the template, replacing each balanced `{name, plural, …}` block with the
 *  branch that fits the param's plural category. Non-plural `{…}` is left intact
 *  for the second placeholder pass. */
function replacePluralBlocks(
  input: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const open = input.indexOf("{", i);
    if (open === -1) {
      out += input.slice(i);
      break;
    }
    out += input.slice(i, open);
    const block = parsePluralBlock(input, open);
    if (!block) {
      // Not a plural block (e.g. a plain `{currency}`) — keep the `{` and move on.
      out += "{";
      i = open + 1;
      continue;
    }
    out += renderPluralBlock(block.name, block.casesStr, params, locale);
    i = block.end;
  }
  return out;
}

/** If `{` at `open` starts a plural block, return its name, the raw cases string,
 *  and the index just past its closing `}`. Otherwise null. */
function parsePluralBlock(
  s: string,
  open: number,
): { name: string; casesStr: string; end: number } | null {
  const head = PLURAL_OPEN_RE.exec(s.slice(open));
  if (!head) return null;
  let depth = 0;
  let j = open;
  for (; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
  }
  if (depth !== 0) return null; // unbalanced — bail, treat as literal
  return { name: head[1], casesStr: s.slice(open + head[0].length, j - 1), end: j };
}

/** Parse `=0 {…} one {…} other {…}` (brace-aware bodies) and pick the branch. */
function renderPluralBlock(
  name: string,
  casesStr: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  const raw = Number(params[name]);
  const value = Number.isFinite(raw) ? raw : 0;
  const category = pluralCategory(value, locale);

  const branches: Record<string, string> = {};
  let i = 0;
  const n = casesStr.length;
  while (i < n) {
    while (i < n && /\s/.test(casesStr[i])) i++; // skip ws
    if (i >= n) break;
    const keyStart = i;
    while (i < n && !/\s/.test(casesStr[i]) && casesStr[i] !== "{") i++;
    const key = casesStr.slice(keyStart, i).trim();
    while (i < n && casesStr[i] !== "{") i++; // skip to body
    if (casesStr[i] !== "{") break;
    let depth = 0;
    const bodyStart = i;
    for (; i < n; i++) {
      if (casesStr[i] === "{") depth++;
      else if (casesStr[i] === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    if (key) branches[key] = casesStr.slice(bodyStart + 1, i - 1);
  }

  const chosen =
    branches[`=${value}`] ?? branches[category] ?? branches.other ?? branches.one ?? "";
  // `#` is the numeric value; nested {placeholder} resolved by the second pass.
  return chosen.replace(/#/g, String(value));
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

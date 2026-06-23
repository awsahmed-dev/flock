"use client";

import { createContext, useContext, useCallback, useMemo, useEffect } from "react";
import { setActiveLocale } from "@/lib/i18n/date-fns";

export type Locale = "en" | "ar";

// Dictionary is opaque to client code — we only know it's a nested
// object of strings. Server keeps the exact JSON shape; here we just
// need `tFromDict`-compatible access.
type Dict = Record<string, unknown>;

interface LocaleContextValue {
  locale: Locale;
  dict: Dict;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Mounted once near the root of the React tree by the server layout.
 * Passes the resolved locale + already-loaded dictionary down so client
 * components don't fetch JSON separately.
 */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, dict, isRtl: locale === "ar" }),
    [locale, dict],
  );
  // B15-d: keep the module-level date-fns active locale in sync on the
  // client so format() calls inside client components match the
  // currently rendered language.
  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * `useT('expenses.logExpense', { name: 'Aws' })` — translate + interpolate.
 *
 * Mirrors the server-side `tFromDict` in lib/i18n. Kept inline (instead
 * of imported) so this file has no server-only dependencies.
 */
export function useT() {
  const ctx = useContext(LocaleContext);
  return useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!ctx) return key;
      const raw = lookup(ctx.dict, key);
      if (raw == null) return key;
      return interpolate(raw, params ?? {}, ctx.locale);
    },
    [ctx],
  );
}

export function useLocale(): { locale: Locale; isRtl: boolean } {
  const ctx = useContext(LocaleContext);
  return {
    locale: ctx?.locale ?? "en",
    isRtl: ctx?.isRtl ?? false,
  };
}

/* ────────────────────── helpers (mirror of server) ────────────────────── */

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

/* B25-followup: sync with the server parser in lib/i18n/index.ts —
 * support `=N` exact-match branches as well as the keyword categories
 * (one/two/few/many/zero/other). Previously the client copy was forked
 * BEFORE the B24 server fix, so any translation using `=0 {No items}`
 * rendered the raw ICU template on screen. Spotted on the Plan day
 * sheet where `itinerary.items` was showing as
 * `{count, plural, =0 {No items} ...}` to the user. */
// Brace-aware ICU plural handling — mirrors the server `interpolate` in
// lib/i18n. The old `\{[^}]*\}` body match couldn't hold a nested {placeholder},
// so Arabic two/few/many branches (which embed {count}/{currency}) leaked the
// raw ICU skeleton on screen (e.g. the money-page subtitle). Kept inline so this
// client file has no server-only deps.
const PLURAL_OPEN_RE = /^\{\s*(\w+)\s*,\s*plural\s*,/;

function interpolate(
  template: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  const afterPlurals = replacePluralBlocks(template, params, locale);
  return afterPlurals.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}

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
      out += "{";
      i = open + 1;
      continue;
    }
    out += renderPluralBlock(block.name, block.casesStr, params, locale);
    i = block.end;
  }
  return out;
}

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
  if (depth !== 0) return null;
  return { name: head[1], casesStr: s.slice(open + head[0].length, j - 1), end: j };
}

function renderPluralBlock(
  name: string,
  casesStr: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  const raw = Number(params[name]);
  const value = Number.isFinite(raw) ? raw : 0;
  const category = new Intl.PluralRules(locale).select(value);

  const branches: Record<string, string> = {};
  let i = 0;
  const n = casesStr.length;
  while (i < n) {
    while (i < n && /\s/.test(casesStr[i])) i++;
    if (i >= n) break;
    const keyStart = i;
    while (i < n && !/\s/.test(casesStr[i]) && casesStr[i] !== "{") i++;
    const key = casesStr.slice(keyStart, i).trim();
    while (i < n && casesStr[i] !== "{") i++;
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
  return chosen.replace(/#/g, String(value));
}

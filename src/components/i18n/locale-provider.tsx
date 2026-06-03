"use client";

import { createContext, useContext, useCallback, useMemo } from "react";

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

const PLURAL_RE =
  /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g;

function interpolate(
  template: string,
  params: Record<string, string | number>,
  locale: Locale,
): string {
  const afterPlurals = template.replace(
    PLURAL_RE,
    (_m, name: string, cases: string) => {
      const value = Number(params[name]);
      const category = new Intl.PluralRules(locale).select(value);
      const branches: Record<string, string> = {};
      const branchRe = /(\w+)\s*\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = branchRe.exec(cases)) !== null) {
        branches[m[1]] = m[2];
      }
      const chosen =
        branches[category] ?? branches.other ?? branches.one ?? "";
      return chosen.replace(/#/g, String(value));
    },
  );
  return afterPlurals.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}

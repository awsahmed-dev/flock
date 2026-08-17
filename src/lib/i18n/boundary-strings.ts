/**
 * Strings for the ROOT error boundary (app/global-error.tsx).
 *
 * That boundary renders INSTEAD of the root layout, so there is no
 * <LocaleProvider>, no dictionary and no `useT()` — and lib/i18n/index.ts is
 * `server-only`. This is the smallest honest alternative to hard-coding
 * English: the locale is read from the `paxawa_locale` cookie on the client
 * and the copy is picked from here. Keep it tiny; every other screen must go
 * through the dictionaries.
 */
export type BoundaryLocale = "en" | "ar";

export const BOUNDARY_STRINGS: Record<BoundaryLocale, {
  title: string; body: string; ref: string; tryAgain: string; dashboard: string;
}> = {
  en: {
    title: "Something went off-course",
    body: "We hit an unexpected error and the page couldn't render. The crew's been notified — try again, or head back to your dashboard.",
    ref: "Ref:",
    tryAgain: "Try again",
    dashboard: "Dashboard",
  },
  ar: {
    title: "حدث خطأ ما في الطريق",
    body: "واجهنا خطأً غير متوقع ولم تتمكن الصفحة من العرض. تم إبلاغ الفريق — حاول مرة أخرى أو ارجع إلى لوحة الرحلات.",
    ref: "المرجع:",
    tryAgain: "حاول مرة أخرى",
    dashboard: "لوحة الرحلات",
  },
};

/** Client-only. Falls back to "en" when the cookie is absent or unreadable. */
export function readBoundaryLocale(): BoundaryLocale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )paxawa_locale=(ar|en)(?:;|$)/);
  return m?.[1] === "ar" ? "ar" : "en";
}

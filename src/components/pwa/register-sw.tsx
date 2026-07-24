"use client";

import { useEffect } from "react";

/**
 * P6 — registers our hand-rolled service worker (`/public/sw.js`). next-pwa
 * can't generate one under Turbopack, so we own registration directly. Runs
 * once after load; no-op where service workers aren't supported.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // Locale guard: a bfcache restore (back/forward nav) resurrects the DOM as
  // it was BEFORE a language switch — old strings, old <html dir> — even
  // though the paxawa_locale cookie has moved on. The cookie is intentionally
  // not httpOnly (see setLocale), so compare it to the restored document's
  // lang and reload on mismatch.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const m = document.cookie.match(/(?:^|;\s*)paxawa_locale=(en|ar)\b/);
      if (m && m[1] !== document.documentElement.lang) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}

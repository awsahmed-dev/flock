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
  return null;
}

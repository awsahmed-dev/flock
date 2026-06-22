"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

/**
 * P6 — app-wide offline indicator. When the connection drops, a slim banner
 * reassures the traveler that their already-opened trip data is still here
 * (the SW serves it from cache). The spotty-signal scenario that started the
 * whole v2 pivot — now the app degrades gracefully instead of breaking.
 */
export function OfflineBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Initialize from the live value (navigator.onLine isn't available at SSR).
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-bold shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5" />
      {t("offline.banner")}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Phase 6 §2.2: cold-start routing. On app open with a LIVE trip, the trip
 * cockpit — not the dashboard — is the front page. `router.replace` so the
 * back button doesn't loop, and a sessionStorage guard so a deliberate
 * "All trips" tap during the trip still lands on the dashboard.
 */
export function ColdStartRedirect({ liveTripId }: { liveTripId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!liveTripId) return;
    try {
      if (sessionStorage.getItem("paxawa-cold-start")) return;
      sessionStorage.setItem("paxawa-cold-start", "1");
    } catch {
      return; // storage unavailable — never trap the user in a redirect loop
    }
    router.replace(`/trips/${liveTripId}`);
  }, [liveTripId, router]);

  return null;
}

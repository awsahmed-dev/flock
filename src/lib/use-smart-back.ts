"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// §5: module-level counter of in-app navigations. When > 0 the user reached the
// current page by navigating inside the app, so "back" can safely pop history
// (router.back) instead of ejecting all the way to the dashboard. On a cold
// load (direct URL / fresh tab) it's 0 → back goes to the fallback.
let inAppNavigations = 0;

export function useSmartBack(fallback = "/dashboard") {
  const router = useRouter();
  const canGoBack = inAppNavigations > 0;

  return {
    canGoBack,
    goBack: () => {
      if (inAppNavigations > 0) {
        inAppNavigations--;
        router.back();
      } else {
        router.push(fallback);
      }
    },
  };
}

/** Mounted once (via <NavigationTracker/>) to count client-side route changes. */
export function useTrackNavigation() {
  const pathname = usePathname();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    inAppNavigations++;
  }, [pathname]);
}

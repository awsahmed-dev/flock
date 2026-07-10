"use client";

import { useTrackNavigation } from "@/lib/use-smart-back";

/** Mounted once in the root layout so in-app route changes are counted for
 *  useSmartBack (§5). Renders nothing. */
export function NavigationTracker() {
  useTrackNavigation();
  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

/**
 * Sprint 3 FIX-2 (BUG-15, survived two QA rounds): sonner v2 pauses every
 * toast timer while `document.hidden` — no opt-out — so in backgrounded /
 * automated windows toasts never time out and "survive tab changes". Route
 * changes are a hard signal the toast's moment has passed: dismiss whatever
 * is still showing. Durations handle the visible-window case; this handles
 * the hidden one.
 */
export function RouteToastReset() {
  const pathname = usePathname();
  const prev = useRef(pathname);
  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname;
      toast.dismiss();
    }
  }, [pathname]);
  return null;
}

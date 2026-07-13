"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sprint 8 Item 2 — horizontal chip row with a scroll affordance.
 * A ~40px gradient on the trailing edge fades the last visible chip into
 * the container background (the standard iOS/Android "more here" signal).
 * It never blocks taps and fades out once the user reaches the end.
 */
export function ChipRail({
  className,
  wrapperClassName,
  fadeColor = "var(--background)",
  children,
}: {
  /** Classes for the scrollable row itself (flex/gap/padding). */
  className?: string;
  /** Classes for the positioning wrapper (negative margins live here). */
  wrapperClassName?: string;
  /** Color the last chip fades into — pass the LOCAL surface the rail sits
      on (e.g. var(--sheet-bg) inside a glass sheet), not always the page. */
  fadeColor?: string;
  children: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);
  const [rtl, setRtl] = useState(false);

  const check = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // scrollLeft runs negative in RTL — abs() covers both directions.
    setAtEnd(max <= 1 || Math.abs(el.scrollLeft) >= max - 1);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    setRtl(getComputedStyle(el).direction === "rtl");
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [check]);

  // Chips mount/unmount without resizing the rail box, so re-measure on
  // every render — ResizeObserver alone misses content-width changes.
  useEffect(check);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <div ref={railRef} className={cn("overflow-x-auto scrollbar-none", className)}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 end-0 w-10 pointer-events-none transition-opacity duration-200",
          atEnd ? "opacity-0" : "opacity-100",
        )}
        style={{ background: `linear-gradient(to ${rtl ? "left" : "right"}, transparent, ${fadeColor})` }}
      />
    </div>
  );
}

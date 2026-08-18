"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { SheetGrip, useDismissDrag } from "@/components/ui/sheet-grip";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Children render below the title. */
  children: React.ReactNode;
  /** Optional sticky footer for primary actions. */
  footer?: React.ReactNode;
  /** Visual size on desktop — mobile is always full-width sheet. */
  size?: "sm" | "md" | "lg";
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

/**
 * Mobile-first bottom sheet. On phones it slides up from the bottom with a
 * drag-handle that dismisses on a 100px+ downward flick. On ≥sm it shows
 * as a centered modal so the same primitive works on laptops without
 * looking like a phone artifact.
 *
 * Built on motion's drag gesture rather than vaul because we already pay
 * for motion and don't want a second animation lib.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: Props) {
  // Lock the body scroll while open so the underlying page doesn't drift
  // behind the sheet on iOS Safari.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes — desktop muscle memory; on mobile the drag-handle does
  // the work but cost is a single keydown listener.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // The track: pill + header are the grab zone; the sheet follows the finger
  // and a 100px pull / flick dismisses (lib/use-sheet-drag — motion's drag
  // never followed a real touch).
  const { gripProps, sheetStyle } = useDismissDrag(onClose);
  // Portal to <body>: rendered inside an animated/transformed ancestor (the
  // Now cockpit), `fixed` was scoped to that ancestor and the sheet slid in
  // UNDER the bottom nav — the budget sheet "crashing" into the nav bar.
  const [host, setHost] = useState<HTMLElement | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only portal host
  useEffect(() => { setHost(document.body); }, []);

  // Sprint 3 FIX-1 (BUG-10, survived two QA rounds): close = INSTANT unmount.
  // The old AnimatePresence exit kept the sheet mounted until its slide-down
  // animation completed — but exit animations run on requestAnimationFrame,
  // which browsers pause for hidden/backgrounded windows and throttle on
  // busy mobile pages. Result: `setOpen(false)` committed, yet the sheet
  // stayed visible AND interactive indefinitely — a second tap on the
  // still-rendered Submit created the duplicate polls/expenses QA logged.
  // Entrance animation stays; correctness no longer depends on exit frames.
  if (!host) return null;
  return createPortal(
    <>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
          />
          {/* Sheet. Sprint 4 FIX-6: entrance is a FADE, not a slide — the old
              y:100%→0 spring moved every row upward for ~500ms (longer in
              throttled/hidden windows), so taps aimed at a label landed 2–3
              rows below it ("Add a booking" was unreachable in QA Round 3).
              Opacity keeps every hit target at its final position from the
              first frame. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={sheetStyle}
            className={cn(
              "fixed left-0 right-0 bottom-0 z-[60] mx-auto bg-card border-t border-border rounded-t-2xl shadow-2xl shadow-black/40",
              "sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:w-full",
              SIZE[size],
              "max-h-[88vh] flex flex-col",
            )}
          >
            {/* Drag handle — mobile only */}
            <SheetGrip {...gripProps} className="sm:hidden" />

            {/* Header (also a grab zone) */}
            {(title || subtitle) && (
              <div {...gripProps} className="flex items-start gap-3 px-5 pt-1 pb-4 sm:pt-5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="font-bold text-base tracking-tight leading-snug">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>

            {/* Sticky footer */}
            {footer && (
              <div className="shrink-0 border-t border-border/60 px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-card/95 backdrop-blur-sm">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </>,
    host,
  );
}

"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useSheetDrag } from "@/lib/use-sheet-drag";
import { cn } from "@/lib/utils";

/**
 * Every sheet that rises from the bottom gets the same "track": a pill you
 * can grab, the sheet follows the finger, and a 100px pull or a flick
 * dismisses it. Aws: "the track should be going for all sheets that come
 * from down to up."
 *
 *   const { gripProps, sheetStyle } = useDismissDrag(onClose);
 *   <div style={sheetStyle}>          ← the sheet root (fixed/bottom)
 *     <SheetGrip {...gripProps} />
 *     …
 */
export function useDismissDrag(onClose: () => void) {
  const [y, setY] = useState(0);
  const closing = useRef(false);
  const { zoneProps } = useSheetDrag({
    onStart: () => { closing.current = false; },
    onMove: (dy) => setY(Math.max(0, dy)),
    onEnd: ({ dy, vy, moved }) => {
      if (moved && (dy > 100 || vy > 500)) {
        closing.current = true;
        onClose();
      }
      setY(0);
    },
  });
  const sheetStyle: CSSProperties = y > 0
    ? { transform: `translateY(${y}px)`, transition: "none" }
    : { transition: "transform 220ms cubic-bezier(.2,.8,.2,1)" };
  return { gripProps: zoneProps, sheetStyle, dragY: y };
}

export function SheetGrip({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      aria-hidden
      className={cn("shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing", className)}
    >
      <span className="block w-10 h-1 rounded-full bg-muted-foreground/30 pointer-events-none" />
    </div>
  );
}

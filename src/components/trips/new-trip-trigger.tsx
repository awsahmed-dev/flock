"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { CreateTripSheet } from "@/components/trips/create-trip-sheet";

/**
 * Opens the 3-step Create-trip sheet (Screen B). Two presentations: the
 * fixed FAB on a populated dashboard, or an inline pill in the empty state.
 */
export function NewTripTrigger({
  variant,
  label,
}: {
  variant: "fab" | "inline" | "card" | "block";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "fab" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="fixed end-5 bottom-[calc(24px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground elev-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      ) : variant === "card" ? (
        // §1-C: dashed "New trip" card at the end of the Coming Up rail.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-tertiary active:scale-[0.98] transition-transform"
          style={{ width: 160, height: 200 }}
        >
          <Plus className="w-6 h-6" />
          <span className="text-[13px] font-medium">{label}</span>
        </button>
      ) : variant === "block" ? (
        // §1-G: full-width dashed CTA when there are no upcoming trips.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 border-2 border-dashed border-border text-muted-foreground active:scale-[0.99] transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[15px] font-medium">{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 h-11 text-sm font-bold active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          {label}
        </button>
      )}
      <CreateTripSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

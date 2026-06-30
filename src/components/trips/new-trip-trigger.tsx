"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateTripSheet } from "@/components/trips/create-trip-sheet";

/**
 * Opens the 3-step Create-trip sheet (Screen B). Two presentations: the
 * fixed FAB on a populated dashboard, or an inline pill in the empty state.
 */
export function NewTripTrigger({
  variant,
  label,
}: {
  variant: "fab" | "inline";
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

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyTasteOnboarding } from "@/lib/actions/taste";
import { ONBOARDING_TILES } from "@/lib/taste-engine";

/**
 * Phase 6 §5-F — the vibe onboarding. Lives INSIDE the feed (not a modal,
 * not a quiz wall) for users with < 3 interactions. Pick 3 tiles → the
 * taste vector seeds instantly.
 */
export function TasteOnboarding({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function done() {
    startTransition(() => {
      applyTasteOnboarding([...picked])
        .then(() => {
          toast.success("Your feed just got personal ✨");
          onDone();
        })
        .catch(() => toast.error("That didn't save — try again"));
    });
  }

  return (
    <section className="rounded-3xl bg-card border border-border p-4 mb-3">
      <p className="text-[15px] font-bold text-foreground">What&rsquo;s your travel vibe?</p>
      <p className="text-[13px] text-muted-foreground mt-0.5 mb-3">
        Pick 3 and your feed gets personal instantly
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ONBOARDING_TILES.map((tile) => {
          const on = picked.has(tile.key);
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => toggle(tile.key)}
              className={`h-11 rounded-2xl px-3 text-[13px] font-semibold text-start border transition-colors ${
                on ? "border-primary text-primary" : "border-border text-foreground"
              }`}
              style={on ? { background: "var(--accent-glow)" } : undefined}
            >
              {tile.label}
            </button>
          );
        })}
      </div>
      {picked.size >= 3 && (
        <button
          type="button"
          onClick={done}
          disabled={pending}
          className="mt-3 w-full h-11 rounded-2xl bg-primary text-white font-bold text-[14px] disabled:opacity-60"
        >
          Done →
        </button>
      )}
    </section>
  );
}

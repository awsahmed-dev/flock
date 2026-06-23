"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Paxawa Control Language — the shared glass material (product-head brief
 * §4). Promoted from the one-off `GlassBtn` that lived in `discover-feed.tsx`
 * into a governed primitive so the whole app's floating control/overlay layer
 * is carved from one piece of glass.
 *
 * HARD RULE (from the brief): glass is the material of the *control & overlay
 * layer* — floating chips, search/map toggles, FABs, map overlays, sheet
 * headers, bottom nav, toasts. Solid (`bg-card`/`bg-background`) stays the
 * material of the *content layer* — card bodies, tables, forms, long-form copy.
 * Never put essential body text or numbers on glass.
 *
 * Two tones, from the token spec (§4.2):
 *   - "dark"  — over photos/maps; white content. (Discover stream, Plan map.)
 *   - "light" — over light content/sheets; foreground content. (Bottom nav,
 *               sheet headers, glass-on-light chrome.)
 * The translucency + blur + a baked-in scrim live in the `.glass-dark` /
 * `.glass-light` CSS utilities (globals.css), which also carry the
 * prefers-reduced-transparency / prefers-reduced-motion fallback to a solid
 * token automatically (§4.3) — so callers get the a11y guardrail for free.
 *
 * "Active" is the legibility-safe opaque inversion (§4.2): the pressed/selected
 * state drops glass entirely for a solid high-contrast fill.
 */

export type GlassTone = "dark" | "light";

/** Base material class for a tone (translucent fill + ring + blur, with the
 *  reduced-transparency fallback). Compose with your own shape/spacing. */
export function glassClass(tone: GlassTone = "dark"): string {
  return tone === "dark" ? "glass-dark" : "glass-light";
}

/** The opaque, high-contrast inversion used for the active/selected/pressed
 *  state — never glass, always legible (§4.2/§4.3). */
function activeClass(tone: GlassTone): string {
  return tone === "dark"
    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-white"
    : "bg-foreground text-background shadow-sm";
}

/** Resting text/icon color over the glass material. */
function restingTextClass(tone: GlassTone): string {
  return tone === "dark" ? "text-white" : "text-foreground";
}

type GlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: GlassTone;
  active?: boolean;
  /** Icon-only round control (the search/map toggle). Defaults to a pill. */
  iconOnly?: boolean;
};

/**
 * A floating glass control. Icon-only → a 40px round button (meets the ≥40px
 * target). Otherwise a pill that sizes to its content. `active` flips to the
 * opaque inversion for the pressed/selected state.
 */
export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  function GlassButton(
    { tone = "dark", active = false, iconOnly = false, className, children, type, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-pressed={active}
        className={cn(
          "shrink-0 inline-flex items-center justify-center font-bold transition-all hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          iconOnly
            ? "w-10 h-10 rounded-full"
            : "gap-1.5 rounded-full px-4 py-2 text-[13px]",
          active ? activeClass(tone) : cn(glassClass(tone), restingTextClass(tone)),
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

type GlassPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: GlassTone;
  as?: "div" | "nav" | "section" | "header";
};

/**
 * A floating glass surface (a control strip, a map overlay, a sheet header, the
 * bottom nav bar). Carries the material + resting content color; the caller
 * owns shape/padding. Content inside should be short labels/icons only — never
 * body text or tables (use a solid `bg-card` for those).
 */
export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel({ tone = "dark", as = "div", className, children, ...rest }, ref) {
    const Comp = as as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(glassClass(tone), restingTextClass(tone), className)}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);

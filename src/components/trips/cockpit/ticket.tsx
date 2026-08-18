"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Now redesign, step 3 — THE primary action as a boarding stub.
 *
 * Purple is the app's chrome (nav, links, Add). The one action a screen asks
 * for stops being purple and takes the hue of WHAT it is, so it is the only
 * saturated block on the page:
 *   horizon  decide / urgent (votes, departure tonight)
 *   dune     pack / money
 *   wayfind  navigate / weather
 *   brand    plan (first stop, invite)
 * The tear-off stub with GO is the tap affordance; the perforation dots are
 * cut from the page background so the ticket reads as paper on the surface.
 */
export type TicketHue = "horizon" | "dune" | "wayfind" | "brand";

export function Ticket({
  hue, kicker, title, sub, icon: Icon, href, onClick, go = "GO", className = "",
}: {
  hue: TicketHue;
  kicker: string;
  title: string;
  sub?: string | null;
  icon: ComponentType<{ size?: number; weight?: "fill" | "regular" | "bold"; className?: string }>;
  href?: string;
  onClick?: () => void;
  go?: string;
  className?: string;
}) {
  const bg = `var(--clr-${hue})`;
  const inner = (
    <>
      <div className="flex-1 min-w-0 px-4 py-3.5" style={{ background: bg }}>
        <p className="text-[10px] font-black tracking-[0.18em] uppercase opacity-70 truncate">{kicker}</p>
        <p className="text-[19px] font-black leading-tight mt-0.5 truncate">{title}</p>
        {sub && <p className="text-[12px] font-semibold opacity-80 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className="relative w-[78px] shrink-0 flex flex-col items-center justify-center gap-0.5 border-s-2 border-dashed" style={{ background: bg, borderColor: "color-mix(in srgb, var(--ticket-fg) 30%, transparent)" }}>
        <span aria-hidden className="absolute -top-2 -start-2 w-4 h-4 rounded-full bg-background" />
        <span aria-hidden className="absolute -bottom-2 -start-2 w-4 h-4 rounded-full bg-background" />
        <Icon size={22} weight="fill" />
        <span className="text-[11px] font-black tracking-wider">{go}</span>
      </div>
    </>
  );
  const cls = `ticket now-rise now-rise-1 flex overflow-hidden rounded-2xl text-[color:var(--ticket-fg)] transition-transform ${className}`;
  const style = { boxShadow: `0 12px 34px color-mix(in srgb, ${bg} 32%, transparent)` };
  if (href) return <Link href={href} onClick={onClick} className={cls} style={style}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={`${cls} w-full text-start`} style={style}>{inner}</button>;
}

/** Quiet sibling for the "nothing due" floor: a card, not a ticket. */
export function QuietAction({
  icon: Icon, title, nudge, href,
}: { icon: ComponentType<{ size?: number; className?: string }>; title: string; nudge: string; href: string }) {
  return (
    <Link href={href} className="now-rise now-rise-1 now-press flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
      <Icon size={22} className="shrink-0 text-primary" />
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] font-semibold text-primary">{nudge}</span>
      </span>
      <CaretRight size={18} className="shrink-0 text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}

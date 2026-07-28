"use client";

/**
 * Landing v3.1 — the pain marquee.
 *
 * An infinite CSS-only ticker of the exact sentences every group trip
 * dies on, each answered by the feature that kills it. Sits between the
 * phase strip and the feature sections as the emotional "oh no, that's
 * us" beat before the sell. Pauses on hover.
 */

const PAINS: { quote: string; fix: string; hue: string }[] = [
  { quote: "“So are we actually doing this?”", fix: "Decided in the Huddle", hue: "#FF8A5C" },
  { quote: "“Who paid for the taxi?”", fix: "Logged in 2 taps", hue: "#9BC97E" },
  { quote: "“Can someone resend the Airbnb link?”", fix: "Pinned to its day", hue: "#3EC5B7" },
  { quote: "“What's the plan tomorrow?”", fix: "It's on NOW", hue: "#8B7CFF" },
  { quote: "“I'll make a spreadsheet”", fix: "Please don't", hue: "#9BC97E" },
  { quote: "“Does anyone have the adapter?”", fix: "Asked once, in Packing", hue: "#FF8A5C" },
  { quote: "“No signal — where was the hotel?”", fix: "Pocket Day works offline", hue: "#E0B252" },
  { quote: "“We never did split that dinner”", fix: "All square 🤝", hue: "#9BC97E" },
  { quote: "“Send me the photos!!”", fix: "They're in the Wrap", hue: "#E0B252" },
  { quote: "“Where should we even eat?”", fix: "Discover knows your crew", hue: "#3EC5B7" },
];

export function PainTicker() {
  const row = [...PAINS, ...PAINS]; // duplicated for a seamless loop
  return (
    <section
      aria-label="Problems Paxawa solves"
      className="relative border-t border-white/[0.06] py-20 sm:py-24 overflow-hidden"
    >
      {/* edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-[#0D0D0D] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-[#0D0D0D] to-transparent" />

      <div className="max-w-7xl mx-auto px-6 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">
          01 · The problem
        </p>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] max-w-2xl">
          Every group trip{" "}
          <span className="text-white/40">dies in the group chat.</span>
        </h2>
      </div>

      <div className="group/ticker flex overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 pe-3 animate-[pain-scroll_46s_linear_infinite] group-hover/ticker:[animation-play-state:paused] motion-reduce:animate-none">
          {row.map((p, i) => (
            <div
              key={i}
              className="shrink-0 flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-[#161616] ps-4 pe-1.5 py-1.5"
            >
              <span className="text-[13px] text-white/45 line-through decoration-white/25">
                {p.quote}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
                style={{ color: p.hue, background: `${p.hue}16`, border: `1px solid ${p.hue}35` }}
              >
                {p.fix}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* keyframes live here so the section is self-contained */}
      <style>{`@keyframes pain-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

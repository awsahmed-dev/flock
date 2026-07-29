"use client";

/**
 * Landing v4 — features as ONE tabbed panel instead of six full-height
 * scroll sections. Same six pillars, same semantic hues, same demos;
 * the visitor flips through them in place. Cuts ~5 viewport-heights of
 * scroll while keeping every interactive demo one click away.
 */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  MapTrifold as MapIcon,
  ChatsCircle as Huddle,
  Wallet,
  Sparkle as Sparkles,
  FilmSlate as Film,
} from "@phosphor-icons/react/dist/ssr";
import { VoteDemo } from "./demos/vote-demo";
import { ExpenseDemo } from "./demos/expense-demo";
import { ItineraryDemo } from "./demos/itinerary-demo";
import { NowDemo } from "./demos/now-demo";
import { DiscoverDemo } from "./demos/discover-demo";
import { WrapDemo } from "./demos/wrap-demo";

type DemoKey = "now" | "plan" | "huddle" | "expense" | "discover" | "wrap";

interface Feature {
  key: DemoKey;
  label: string;
  title: string;
  accentWords: number;
  body: string;
  kills: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: string;
}

const FEATURES: Feature[] = [
  {
    key: "now",
    label: "Home",
    title: "A home screen that knows what week it is",
    accentWords: 3,
    body: "A cockpit months out, a T-minus board in departure week, just today's plan on the trip.",
    kills: "the 47-tab planning doc",
    cta: "Get your cockpit",
    icon: Sparkles,
    hue: "#8B7CFF",
  },
  {
    key: "plan",
    label: "Plan",
    title: "One itinerary the whole crew can edit",
    accentWords: 2,
    body: "Drag a card and everyone sees it move. Bookings pin to their day.",
    kills: "the shared spreadsheet",
    cta: "Build day one",
    icon: MapIcon,
    hue: "#3EC5B7",
  },
  {
    key: "huddle",
    label: "Decide",
    title: "Group debates end in the Huddle",
    accentWords: 2,
    body: "Polls that close themselves — the winner becomes the plan.",
    kills: "the 400-message group chat",
    cta: "Settle a debate",
    icon: Huddle,
    hue: "#FF8A5C",
  },
  {
    key: "expense",
    label: "Split",
    title: "Point the camera at the receipt",
    accentWords: 2,
    body: "Point the camera, the split is logged — any currency, live rates, two-tap settle.",
    kills: "the awkward money math",
    cta: "Split something",
    icon: Wallet,
    hue: "#9BC97E",
  },
  {
    key: "discover",
    label: "Discover",
    title: "Places the whole crew will actually like",
    accentWords: 2,
    body: "Google places ranked by the crew's taste — 'Priya's kind of place.'",
    kills: "four hours of tab-swapping",
    cta: "See your crew's picks",
    icon: Compass,
    hue: "#3EC5B7",
  },
  {
    key: "wrap",
    label: "Remember",
    title: "Every trip ends with the Wrap",
    accentWords: 2,
    body: "Photos, awards, and the final settle-up — the trip gets an ending.",
    kills: "the group chat that quietly dies",
    cta: "Earn your Wrap",
    icon: Film,
    hue: "#E0B252",
  },
];

function Demo({ demo }: { demo: DemoKey }) {
  if (demo === "now") return <NowDemo />;
  if (demo === "plan") return <ItineraryDemo />;
  if (demo === "huddle") return <VoteDemo />;
  if (demo === "expense") return <ExpenseDemo />;
  if (demo === "discover") return <DiscoverDemo />;
  return <WrapDemo />;
}

export function FeatureTabs() {
  const [active, setActive] = useState<DemoKey>("now");
  const f = FEATURES.find((x) => x.key === active)!;
  const words = f.title.split(" ");
  const lead = words.slice(0, words.length - f.accentWords).join(" ");
  const accentTail = words.slice(-f.accentWords).join(" ");

  return (
    <section id="features" className="relative border-t border-white/[0.06] scroll-mt-20">
      {/* ambient hue bleed follows the active tab */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 -translate-y-1/2 -left-40 w-[42rem] h-[42rem] rounded-full blur-[130px] transition-colors duration-700"
          style={{ background: f.hue, opacity: 0.07 }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">
          03 · The toolkit
        </p>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] max-w-3xl leading-[1.05]">
          The right tool for every shape.
        </h2>
        <p className="mt-4 text-white/45 text-base sm:text-lg">
          Real screens — click around.
        </p>

        {/* Tab rail */}
        <div
          role="tablist"
          aria-label="Paxawa features"
          className="mt-10 flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap"
        >
          {FEATURES.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.key)}
                className="shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-all"
                style={
                  isActive
                    ? { color: "#0D0D0D", background: t.hue, borderColor: t.hue }
                    : {
                        color: "rgba(255,255,255,0.55)",
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "transparent",
                      }
                }
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="mt-10 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start lg:min-h-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${f.key}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-lg">
                {lead && <>{lead} </>}
                <span style={{ color: f.hue }}>{accentTail}</span>
              </h3>
              <p className="mt-6 text-base sm:text-lg text-white/55 leading-relaxed max-w-md">
                {f.body}
              </p>
              <p className="mt-4 text-sm text-white/35">
                Replaces:{" "}
                <span className="line-through decoration-white/30">{f.kills}</span>
              </p>
              <div className="mt-7 flex items-center gap-4 flex-wrap">
                <Link
                  href="/auth/signup"
                  className="group inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors"
                  style={{ color: f.hue, borderColor: `${f.hue}45`, background: `${f.hue}10` }}
                >
                  {f.cta}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <NextTab active={active} onNext={setActive} />
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`demo-${f.key}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.3 }}
              className="lg:ps-8"
            >
              <Demo demo={f.key} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function NextTab({
  active,
  onNext,
}: {
  active: DemoKey;
  onNext: (k: DemoKey) => void;
}) {
  const idx = FEATURES.findIndex((x) => x.key === active);
  const next = FEATURES[(idx + 1) % FEATURES.length];
  return (
    <button
      type="button"
      onClick={() => onNext(next.key)}
      className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
    >
      Next: {next.label}
      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
    </button>
  );
}

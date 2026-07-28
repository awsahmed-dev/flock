"use client";

/**
 * Scrollytelling v3 — the app's own design system on the marketing page.
 *
 * Six sections, one per real pillar of the current product, each carrying
 * the SAME semantic hue that feature wears inside the app:
 *
 *   NOW cockpit  → brand   #8B7CFF
 *   Itinerary    → wayfind #3EC5B7 (the route line's color)
 *   Huddle       → horizon #FF8A5C (live/social)
 *   Money        → moss    #9BC97E (money/progress)
 *   Discover     → wayfind #3EC5B7
 *   The Wrap     → dune    #E0B252 (prep/recap gold)
 *
 * No rainbow gradient text — one hue per section, used exactly once in
 * the headline tail + eyebrow + glow. Layout keeps the proven sticky
 * two-column pattern; sections alternate sides.
 */

import { motion } from "motion/react";
import {
  Compass,
  MapTrifold as MapIcon,
  ChatsCircle as Huddle,
  Wallet,
  Sparkle as Sparkles,
  FilmSlate as Film,
} from "@phosphor-icons/react/dist/ssr";
import { SectionGlow } from "./aurora";
import { VoteDemo } from "./demos/vote-demo";
import { ExpenseDemo } from "./demos/expense-demo";
import { ItineraryDemo } from "./demos/itinerary-demo";
import { NowDemo } from "./demos/now-demo";
import { DiscoverDemo } from "./demos/discover-demo";
import { WrapDemo } from "./demos/wrap-demo";

type DemoKey = "now" | "plan" | "huddle" | "expense" | "discover" | "wrap";

interface Feature {
  key: string;
  eyebrow: string;
  title: string;
  /** How many trailing words of the title get the hue. */
  accentWords: number;
  body: string;
  demo: DemoKey;
  icon: React.ComponentType<{ className?: string }>;
  /** The feature's in-app semantic hue. */
  hue: string;
  /** Tailwind bg class for the SectionGlow blob. */
  glow: string;
}

const FEATURES: Feature[] = [
  {
    key: "now",
    eyebrow: "Home",
    title: "A home screen that knows what week it is",
    accentWords: 3,
    body: "Months out, NOW is a cockpit — readiness, day chips, open decisions. Departure week it becomes a T-minus board. On the trip it shows today only. No digging, ever.",
    demo: "now",
    icon: Sparkles,
    hue: "#8B7CFF",
    glow: "bg-[#8B7CFF]",
  },
  {
    key: "plan",
    eyebrow: "Plan",
    title: "One itinerary the whole crew can edit",
    accentWords: 2,
    body: "Days on a shared map, stops in a shared order. Drag any card to reorder — everyone sees it move. Bookings pin to their day, so the confirmation is always one tap from the plan.",
    demo: "plan",
    icon: MapIcon,
    hue: "#3EC5B7",
    glow: "bg-[#3EC5B7]",
  },
  {
    key: "huddle",
    eyebrow: "Decide",
    title: "Group debates end in the Huddle",
    accentWords: 2,
    body: "Polls that close themselves, documents where everyone finds them, a pulse feed of what the crew just did — and the packing list, so 'who has the adapter?' is asked exactly once.",
    demo: "huddle",
    icon: Huddle,
    hue: "#FF8A5C",
    glow: "bg-[#FF8A5C]",
  },
  {
    key: "money",
    eyebrow: "Split",
    title: "Point the camera at the receipt",
    accentWords: 2,
    body: "Point-and-Split reads the receipt and logs the expense; any currency converts at live rates. Balances stay honest the whole trip, and settling up is two taps — not a spreadsheet.",
    demo: "expense",
    icon: Wallet,
    hue: "#9BC97E",
    glow: "bg-[#9BC97E]",
  },
  {
    key: "discover",
    eyebrow: "Discover",
    title: "Places the whole crew will actually like",
    accentWords: 2,
    body: "Real places from Google, ranked by the crew's combined taste. Hearts teach it. Reason chips tell you why — 'Priya's kind of place' beats four hours of tab-swapping.",
    demo: "discover",
    icon: Compass,
    hue: "#3EC5B7",
    glow: "bg-[#3EC5B7]",
  },
  {
    key: "wrap",
    eyebrow: "Remember",
    title: "Every trip ends with the Wrap",
    accentWords: 2,
    body: "Photos, stats, crew awards, and the final settle-up in one shareable recap. The trip gets an ending — not a group chat that quietly dies.",
    demo: "wrap",
    icon: Film,
    hue: "#E0B252",
    glow: "bg-[#E0B252]",
  },
];

export function Scrollytelling() {
  return (
    <div id="features" className="relative scroll-mt-20">
      {/* Section heading lead-in */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 sm:pt-32">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">
          What&apos;s inside
        </p>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] max-w-2xl leading-[1.05]">
          Real screens. Real interactions.{" "}
          <span className="text-white/40">Click around.</span>
        </h2>
      </div>

      {FEATURES.map((f, i) => (
        <FeatureSection
          key={f.key}
          feature={f}
          side={i % 2 === 0 ? "left" : "right"}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function FeatureSection({
  feature: f,
  side,
}: {
  feature: Feature;
  side: "left" | "right";
}) {
  const Icon = f.icon;
  const words = f.title.split(" ");
  const lead = words.slice(0, words.length - f.accentWords).join(" ");
  const accentTail = words.slice(-f.accentWords).join(" ");

  return (
    <section className="relative border-t border-white/[0.06]">
      <SectionGlow color={f.glow} side={side} />
      <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left — sticky title + copy */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] mb-5 rounded-full border px-2.5 py-1"
            style={{
              color: f.hue,
              borderColor: `${f.hue}40`,
              background: `${f.hue}14`,
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {f.eyebrow}
          </div>
          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-lg"
          >
            {lead && <>{lead} </>}
            <span style={{ color: f.hue }}>{accentTail}</span>
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-base sm:text-lg text-white/55 leading-relaxed max-w-md"
          >
            {f.body}
          </motion.p>
        </div>

        {/* Right — demo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="lg:ps-8"
        >
          <FeatureDemo demo={f.demo} />
        </motion.div>
      </div>
    </section>
  );
}

function FeatureDemo({ demo }: { demo: DemoKey }) {
  if (demo === "now") return <NowDemo />;
  if (demo === "plan") return <ItineraryDemo />;
  if (demo === "huddle") return <VoteDemo />;
  if (demo === "expense") return <ExpenseDemo />;
  if (demo === "discover") return <DiscoverDemo />;
  return <WrapDemo />;
}

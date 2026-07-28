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

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
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
  /** The thing this feature makes obsolete — rendered struck through. */
  kills: string;
  /** Per-section conversion link label. */
  cta: string;
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
    body: "Open the app, see exactly what matters today. Months out it's a cockpit — readiness, day chips, open decisions. Departure week it's a T-minus board. On the trip: today's plan, nothing else. You never dig.",
    kills: "the 47-tab planning doc",
    cta: "Get your cockpit",
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
    body: "Days on a shared map, stops in a shared order — drag a card and the whole crew sees it move. Bookings pin to their day, so the confirmation is one tap from the plan. Try the drag right here →",
    kills: "the shared spreadsheet",
    cta: "Build day one",
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
    body: "Open a poll, attach the costs, let it close itself — the winner becomes the plan. Documents live where everyone finds them, and the packing list means 'who has the adapter?' gets asked exactly once. Cast a vote →",
    kills: "the 400-message group chat",
    cta: "Settle a debate",
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
    body: "Point-and-Split reads the receipt and logs the split before you've pocketed your phone. Any currency, live rates, balances that stay honest all trip. Settling up is two taps — and nobody chases anybody.",
    kills: "the awkward money math",
    cta: "Split something",
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
    body: "Real places from Google, ranked by your crew's combined taste — hearts teach it, reason chips tell you why. 'Priya's kind of place' ends the where-should-we-eat debate before it starts.",
    kills: "four hours of tab-swapping",
    cta: "See your crew's picks",
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
    body: "Photos, stats, crew awards, and the final settle-up in one shareable recap. Your trip gets a finale — and the Wrap is what makes the crew say 'okay, where next?'",
    kills: "the group chat that quietly dies",
    cta: "Earn your Wrap",
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
          These aren&apos;t mockups.{" "}
          <span className="text-white/40">Click around — it&apos;s the real app.</span>
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
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-4 text-sm text-white/35"
          >
            Replaces:{" "}
            <span className="line-through decoration-white/30">{f.kills}</span>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-7"
          >
            <Link
              href="/auth/signup"
              className="group inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors"
              style={{ color: f.hue, borderColor: `${f.hue}45`, background: `${f.hue}10` }}
            >
              {f.cta}
              <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
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

"use client";

/**
 * Scrollytelling v2 — Framer-style.
 *
 * Pattern per the user's reference screenshots:
 *   - One <FeatureSection/> per feature.
 *   - Each section is min-h-screen tall.
 *   - Inside, a 2-column grid: title+copy on the left, demo card on the right.
 *   - The left column uses `lg:sticky lg:top-1/3` so the title hangs in
 *     place while the right column scrolls past — pure CSS, no progress
 *     math, no overlapping content.
 *
 * Right-column cards are flat 2D mockups (the same SVG screens we already
 * authored), no phone bezel, no notch, no shadow gimmick. Just a sharp
 * card with a thin white border.
 *
 * Mobile (under lg): single column, sticky disabled, normal vertical flow.
 */

import { motion } from "motion/react";
import { Calendar, Vote, Wallet, Backpack, Sparkles } from "lucide-react";
import { SectionGlow } from "./aurora";
import { ChatDemo } from "./demos/chat-demo";
import { VoteDemo } from "./demos/vote-demo";
import { ExpenseDemo } from "./demos/expense-demo";

type DemoKey = "chat" | "vote" | "expense" | "static";

interface Feature {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Which interactive demo renders on the right side. `static` falls back
   *  to the SVG mockup at `screen`. */
  demo: DemoKey;
  /** SVG screen used as fallback when `demo === "static"`. */
  screen: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  /** Tailwind bg class used by the SectionGlow blob behind this feature. */
  glow: string;
  /** Gradient-text class applied to the title's accent span. */
  accent: string;
}

const FEATURES: Feature[] = [
  {
    key: "chat",
    eyebrow: "Talk",
    title: "AI-aware group chat that turns talk into the plan",
    body:
      "Type a message — Claude reads it and offers one-tap chips. 'We should go to El Vilsito tomorrow' becomes a calendar entry. 'I paid €120 for dinner' becomes a split expense. Try it on the right →",
    demo: "chat",
    screen: "/screens/chat.svg",
    icon: Sparkles,
    iconColor: "text-fuchsia-400",
    glow: "bg-fuchsia-500",
    accent:
      "bg-gradient-to-br from-fuchsia-300 via-pink-300 to-rose-300 bg-clip-text text-transparent",
  },
  {
    key: "vote",
    eyebrow: "Decide",
    title: "Settle the group debate in one screen",
    body:
      "Open a vote on any decision — hotel, restaurant, day plan. Attach cost estimates. The winning option becomes the plan, the rest archive. Cast one on the right →",
    demo: "vote",
    screen: "/screens/vote.svg",
    icon: Vote,
    iconColor: "text-violet-400",
    glow: "bg-violet-500",
    accent:
      "bg-gradient-to-br from-violet-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent",
  },
  {
    key: "pay",
    eyebrow: "Split",
    title: "Multi-currency expenses, accurate balances",
    body:
      "Log spend as it happens in any currency. Equal-split or custom. Live balances tell you who owes whom. Change the amount or payer on the right →",
    demo: "expense",
    screen: "/screens/pay.svg",
    icon: Wallet,
    iconColor: "text-emerald-400",
    glow: "bg-emerald-500",
    accent:
      "bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent",
  },
  {
    key: "plan",
    eyebrow: "Plan",
    title: "One itinerary the whole crew can edit",
    body:
      "Drag, drop, propose, confirm — every activity, stay, transport, and meal in one place. AI can draft the trip in seconds; you tune what stays.",
    demo: "static",
    screen: "/screens/plan.svg",
    icon: Calendar,
    iconColor: "text-blue-400",
    glow: "bg-blue-500",
    accent:
      "bg-gradient-to-br from-blue-300 via-indigo-300 to-blue-200 bg-clip-text text-transparent",
  },
  {
    key: "pack",
    eyebrow: "Prepare",
    title: "Packing that's shared and personal at the same time",
    body:
      "Group items everyone can check off. Personal items only you can toggle. Crew view shows who's lagging. Pre-trip nudges fire 30, 14, 7, and 1 days out.",
    demo: "static",
    screen: "/screens/pack.svg",
    icon: Backpack,
    iconColor: "text-amber-400",
    glow: "bg-amber-500",
    accent:
      "bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent",
  },
];

export function Scrollytelling() {
  return (
    <div id="features" className="relative scroll-mt-20">
      {/* Section heading lead-in */}
      <div id="try-it" className="max-w-7xl mx-auto px-6 pt-24 pb-12 sm:pt-32 scroll-mt-20">
        <p className="text-sm text-white/40 mb-3">Try it · No signup needed</p>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] max-w-2xl leading-[1.05]">
          Real screens. Real interactions.{" "}
          <span className="text-white/40">Click around.</span>
        </h2>
      </div>

      {FEATURES.map((f, i) => (
        <FeatureSection key={f.key} feature={f} side={i % 2 === 0 ? "left" : "right"} />
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
  // Split the title at its last word so we can gradient the final clause —
  // adds a moment of color without painting the whole headline.
  const words = f.title.split(" ");
  const lead = words.slice(0, words.length - 2).join(" ");
  const accentTail = words.slice(-2).join(" ");

  return (
    <section className="relative border-t border-white/[0.06]">
      <SectionGlow color={f.glow} side={side} />
      <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Left — sticky title + copy */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div
            className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] mb-5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 ${f.iconColor}`}
          >
            <Icon className={`w-3.5 h-3.5 ${f.iconColor}`} />
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
            <span className={f.accent}>{accentTail}</span>
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

        {/* Right — interactive demo (or static screenshot fallback) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="lg:pl-8"
        >
          <FeatureDemo demo={f.demo} screen={f.screen} title={f.title} />
        </motion.div>
      </div>
    </section>
  );
}

function FeatureDemo({
  demo,
  screen,
  title,
}: {
  demo: DemoKey;
  screen: string;
  title: string;
}) {
  if (demo === "chat") return <ChatDemo />;
  if (demo === "vote") return <VoteDemo />;
  if (demo === "expense") return <ExpenseDemo />;
  // static fallback for features whose interactive demo isn't built yet.
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]"
      style={{ aspectRatio: "9 / 16", maxWidth: 420, marginInline: "auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screen}
        alt={`${title} screen`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

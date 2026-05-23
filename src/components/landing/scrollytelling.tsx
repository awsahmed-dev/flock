"use client";

/**
 * Framer-style scrollytelling section.
 *
 * Layout: a tall vertical container with sticky-positioned right column
 * (the phone mockup) and a flowing left column of feature descriptions.
 * As the user scrolls past each description, useScroll + useTransform
 * computes which feature is "active" and we swap the phone screen + headline.
 *
 * On mobile the layout collapses to a single column with phones inline
 * between descriptions — same content, no sticky behavior (sticky on
 * mobile fights the small viewport and feels broken).
 */

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { PhoneFrame } from "./device-frames";
import { Calendar, Vote, Wallet, Backpack, Sparkles } from "lucide-react";

interface Feature {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  screen: string; // path under /public
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const FEATURES: Feature[] = [
  {
    key: "plan",
    eyebrow: "Plan",
    title: "A shared itinerary the whole crew can actually edit",
    body:
      "Drag, drop, propose, confirm — every activity, stay, transport, and meal in one place. AI can draft the entire trip in seconds, then you tune what stays.",
    screen: "/screens/plan.svg",
    icon: Calendar,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
  },
  {
    key: "vote",
    eyebrow: "Decide",
    title: "Settle the group debate without scrolling chat for hours",
    body:
      "Open a vote on any decision — hotel, restaurant, day plan. Attach cost estimates. The winning option becomes the plan, the rest archive. No more 'wait I missed the message in the WhatsApp.'",
    screen: "/screens/vote.svg",
    icon: Vote,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
  },
  {
    key: "pay",
    eyebrow: "Split",
    title: "Multi-currency expenses, accurate balances, zero spreadsheet",
    body:
      "Log expenses as they happen, in any currency. Equal-split or custom. Live balances tell you who owes whom. Smart action chips spot 'I paid for dinner' in chat and offer a one-tap log.",
    screen: "/screens/pay.svg",
    icon: Wallet,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  {
    key: "pack",
    eyebrow: "Prepare",
    title: "Packing list that's shared and personal at the same time",
    body:
      "Group items (tent, first-aid kit) everyone can check off. Personal items only you can toggle. Crew view shows who's lagging. Pre-trip nudges fire 30, 14, 7, and 1 days out.",
    screen: "/screens/pack.svg",
    icon: Backpack,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
  {
    key: "chat",
    eyebrow: "Talk",
    title: "AI-aware group chat that turns talk into the plan",
    body:
      "Pinned messages, read receipts, photo gallery — and Claude Haiku watching for actionable intent. Someone says 'we should go to El Vilsito tomorrow' and the right chip appears under their message.",
    screen: "/screens/chat.svg",
    icon: Sparkles,
    iconBg: "bg-fuchsia-500/15",
    iconColor: "text-fuchsia-400",
  },
];

export function Scrollytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 0..1 progress across the whole scrollytelling container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Spring-smoothed progress for fluid screen swaps
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 0.3,
  });

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{
        // 5 features × ~70vh each. Adjust to taste; more vh = slower scroll.
        height: `${FEATURES.length * 70}vh`,
      }}
    >
      {/* Pinned right-side phone (desktop only) */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <div className="absolute inset-0 flex items-center justify-end pr-[8%]">
          <div className="relative w-[320px] h-[640px]">
            {FEATURES.map((f, i) => {
              // Each phone is visible during its own 1/N slice of the scroll.
              const start = i / FEATURES.length;
              const end = (i + 1) / FEATURES.length;
              const fadeIn = Math.max(0, start - 0.05);
              const fadeOut = Math.min(1, end - 0.02);
              return (
                <ScrollPhone
                  key={f.key}
                  progress={smoothProgress}
                  fadeIn={fadeIn}
                  start={start}
                  end={end}
                  fadeOut={fadeOut}
                  src={f.screen}
                  alt={`${f.title} screen`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Left column of feature text — also pinned, but the *content*
          inside swaps as you scroll. We use the same progress to choose
          which feature paragraph to render via opacity. */}
      <div className="hidden lg:block sticky top-0 h-screen pointer-events-none">
        <div className="absolute inset-0 flex items-center pl-[8%] pr-[55%]">
          <div className="relative w-full">
            {FEATURES.map((f, i) => {
              const start = i / FEATURES.length;
              const end = (i + 1) / FEATURES.length;
              return (
                <ScrollText
                  key={f.key}
                  feature={f}
                  progress={smoothProgress}
                  start={start}
                  end={end}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile fallback: just a vertical stack with inline phones */}
      <div className="lg:hidden flex flex-col gap-20 py-12">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.key}
              className="px-6 flex flex-col items-center text-center gap-6"
            >
              <div className="max-w-md">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${f.iconBg}`}
                >
                  <Icon className={`w-3 h-3 ${f.iconColor}`} />
                  <span className={f.iconColor}>{f.eyebrow}</span>
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-white leading-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {f.body}
                </p>
              </div>
              <PhoneFrame src={f.screen} alt={f.title} scale={0.85} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function ScrollPhone({
  progress,
  fadeIn,
  start,
  end,
  fadeOut,
  src,
  alt,
}: {
  progress: ReturnType<typeof useSpring>;
  fadeIn: number;
  start: number;
  end: number;
  fadeOut: number;
  src: string;
  alt: string;
}) {
  const opacity = useTransform(
    progress,
    [fadeIn, start, end, fadeOut],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [start, end], [40, -40]);
  const scale = useTransform(progress, [start, end], [0.95, 1.05]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ opacity, y, scale }}
    >
      <PhoneFrame src={src} alt={alt} scale={1.1} />
    </motion.div>
  );
}

function ScrollText({
  feature,
  progress,
  start,
  end,
}: {
  feature: Feature;
  progress: ReturnType<typeof useSpring>;
  start: number;
  end: number;
}) {
  // Slightly tighter visibility band so adjacent texts don't overlap.
  const fadeIn = Math.max(0, start - 0.04);
  const fadeOut = Math.min(1, end - 0.04);
  const opacity = useTransform(
    progress,
    [fadeIn, start, end, fadeOut],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [start, end], [30, -30]);

  const Icon = feature.icon;

  return (
    <motion.div
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 max-w-xl"
      style={{ opacity, y }}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${feature.iconBg}`}
      >
        <Icon className={`w-3 h-3 ${feature.iconColor}`} />
        <span className={feature.iconColor}>{feature.eyebrow}</span>
      </span>
      <h3 className="mt-4 text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.05]">
        {feature.title}
      </h3>
      <p className="mt-4 text-base leading-relaxed text-white/60">
        {feature.body}
      </p>
    </motion.div>
  );
}

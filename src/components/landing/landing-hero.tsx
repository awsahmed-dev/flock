"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { HeroAurora } from "./aurora";

/**
 * Hero — centered Framer-style. Massive headline, short sub, two CTAs,
 * then a row of 4 destination photos below as "this is what your next trip
 * looks like" social proof.
 *
 * Pure black background, no glow gradients, no device chrome. Type does
 * the heavy lifting. Photos are hot-linked from Unsplash (free, hot-link
 * permitted by their license) — easy to swap later for the user's own.
 */

// Curated Unsplash photos — varied destinations, all landscape-oriented,
// all royalty-free under the Unsplash license. Sized at 1200w for sharp
// retina at the rendered ~280px width.
const DESTINATIONS: { src: string; alt: string; label: string }[] = [
  {
    src: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1200&auto=format&fit=crop&q=80",
    alt: "Tokyo crosswalk at night",
    label: "Tokyo",
  },
  {
    src: "https://images.unsplash.com/photo-1539020140153-e479b8c5ee35?w=1200&auto=format&fit=crop&q=80",
    alt: "Marrakech blue alleyway",
    label: "Marrakech",
  },
  {
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80",
    alt: "Paris rooftops",
    label: "Paris",
  },
  {
    src: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80",
    alt: "Iceland mountain road",
    label: "Iceland",
  },
];

export function LandingHero() {
  return (
    <section className="relative pt-20 sm:pt-32 pb-16 sm:pb-24 px-6 overflow-hidden">
      {/* Aurora glow behind hero — adds quiet color personality without
          breaking the sharp 2026 black aesthetic. */}
      <HeroAurora />

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-white/60 mb-6 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 animate-pulse" />
          Group travel, finally calm · Free to start
        </motion.p>

        {/* Headline — gradient on the key word so color reads as intentional */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-[44px] leading-[1] sm:text-7xl lg:text-8xl font-semibold tracking-[-0.045em] text-white"
        >
          Plan the{" "}
          <span className="bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            trip.
          </span>
          <br />
          <span className="text-white/40">Not the group chat.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-7 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          Itinerary, voting, multi-currency expenses, packing list — and an AI
          that turns talk into the plan. One link to invite the crew.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          {/* Primary CTA — subtle gradient halo on hover to keep the
              "white pill" simplicity but add a moment of life. */}
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-5 py-3 text-sm font-semibold transition-colors"
          >
            <span
              aria-hidden
              className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 opacity-0 group-hover:opacity-60 blur-md transition-opacity -z-10"
            />
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-full border border-white/15 hover:bg-white/[0.04] px-5 py-3 text-sm font-medium transition-colors"
          >
            Log in
          </Link>
        </motion.div>
      </div>

      {/* Destination photo strip — replaces the old phone collage */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4 }}
        className="mt-24 sm:mt-32 max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {DESTINATIONS.map((d) => (
          <div
            key={d.label}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.src}
              alt={d.alt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            {/* Subtle bottom gradient for legibility of the label */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
            <p className="absolute bottom-3 left-4 text-sm font-semibold tracking-wide text-white">
              {d.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

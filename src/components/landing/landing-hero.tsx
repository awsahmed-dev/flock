"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { PhoneFrame } from "./device-frames";

/**
 * Landing hero. Centered headline + sub + dual CTA on the left, a trio of
 * floating phones on the right with subtle parallax-on-scroll handled by
 * motion's `whileInView` + `transition.delay` for the entrance.
 *
 * No screenshot loading: each phone uses an SVG mockup from /public/screens/
 * which the user can swap for real PNGs once design is ready.
 */
export function LandingHero() {
  return (
    <section className="relative pt-12 pb-24 sm:pt-20 sm:pb-32 overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[120%] h-[800px] rounded-full bg-gradient-to-b from-indigo-600/30 via-violet-600/20 to-transparent blur-3xl pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 text-indigo-300 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-indigo-500/20"
          >
            <Sparkles className="w-3 h-3" />
            Group travel, finally calm
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
          >
            Plan the trip.{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              Not the group chat.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-white/70 leading-relaxed max-w-xl"
          >
            Itinerary, voting, multi-currency expenses, packing list — and an
            AI that watches the chat and turns talk into the plan. One link to
            invite the crew. Free to start.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 px-5 py-3 text-sm font-bold shadow-xl shadow-indigo-500/30 transition-opacity"
            >
              Plan your first trip
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-full border border-white/15 hover:bg-white/5 px-5 py-3 text-sm font-bold transition-colors"
            >
              Sign in
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-4 text-xs text-white/40"
          >
            No credit card required · Guests join with just a name
          </motion.p>
        </div>

        {/* Phone collage */}
        <div className="relative h-[520px] hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -10 }}
            animate={{ opacity: 1, y: 0, rotate: -8 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute left-0 top-8"
          >
            <PhoneFrame
              src="/screens/plan.svg"
              alt="Itinerary preview"
              scale={0.85}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60, rotate: 12 }}
            animate={{ opacity: 1, y: 0, rotate: 6 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute right-0 top-0 z-10"
          >
            <PhoneFrame
              src="/screens/vote.svg"
              alt="Voting preview"
              scale={0.95}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20"
          >
            <PhoneFrame
              src="/screens/pay.svg"
              alt="Expenses preview"
              scale={0.75}
            />
          </motion.div>
        </div>

        {/* Mobile single-phone version */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="lg:hidden mx-auto"
        >
          <PhoneFrame src="/screens/plan.svg" alt="Paxawa app" scale={0.7} />
        </motion.div>
      </div>
    </section>
  );
}

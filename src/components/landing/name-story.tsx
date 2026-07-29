"use client";

import { motion } from "motion/react";

/**
 * Landing v4 — the name, decoded as a slim band right under the hero
 * (not a big standalone section; the word "sawa" then recurs through
 * the page down to the footer). One glance: pax + sawa = the mission.
 */
export function NameStory() {
  return (
    <section className="relative border-t border-white/[0.06]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-6 py-10 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-5">
          The name
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-x-10 gap-y-3">
        <p className="text-sm sm:text-base">
          <span className="font-bold text-[#8B7CFF]">pax</span>
          <span className="text-white/35"> · </span>
          <span className="text-white/80 font-semibold">travelers</span>
        </p>
        <span className="hidden sm:block text-white/20 text-xl font-light">+</span>
        <p className="text-sm sm:text-base">
          <span className="font-bold text-[#E0B252]">sawa</span>
          <span className="text-[#E0B252] font-semibold"> سوا</span>
          <span className="text-white/35"> · </span>
          <span className="text-white/80 font-semibold">together</span>
        </p>
        <span className="hidden sm:block text-white/20 text-xl font-light">=</span>
        <p className="text-sm sm:text-base font-semibold text-white">
          Paxawa<span className="text-white/40 font-normal"> — travelers, together.</span>
        </p>
        </div>
      </motion.div>
    </section>
  );
}

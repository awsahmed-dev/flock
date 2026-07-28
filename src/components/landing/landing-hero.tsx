"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { HeroAurora } from "./aurora";
import { HeroPhone } from "./hero-phone";

/**
 * Hero v4 — JobSeekr-coded center phone with floating feature cards.
 *
 * Layout: centered eyebrow + headline + sub + CTAs, then the HeroPhone
 * composition. As the user scrolls down, motion's useScroll/useTransform
 * applies a soft parallax — the headline drifts up faster than the phone
 * stack, so they offset in a way that feels alive but not theatrical.
 *
 * Travel-imagery strip stays at the bottom of the hero for the "this is
 * what your next trip looks like" beat.
 */

const DESTINATIONS: { src: string; alt: string; label: string }[] = [
  {
    src: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1200&auto=format&fit=crop&q=80",
    alt: "Tokyo crosswalk at night",
    label: "Tokyo",
  },
  {
    src: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1200&auto=format&fit=crop&q=80",
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
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Headline drifts up faster than the phone stack as user scrolls — soft
  // parallax depth without being seasick.
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative pt-20 sm:pt-28 pb-12 sm:pb-20 px-6 overflow-hidden"
    >
      <HeroAurora />

      <motion.div
        style={{ y: headlineY, opacity: heroOpacity }}
        className="relative max-w-5xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-white/60 mb-6 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#9BC97E] animate-pulse" />
          <span className="font-semibold text-[#B3A8FF]">pax</span>
          <span className="text-white/40">+</span>
          <span className="font-semibold text-[#E8CB86]">sawa&nbsp;·&nbsp;سوا</span>
          <span className="text-white/40">— travelers, together · Free · English + العربية</span>
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-[40px] leading-[1.02] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.045em] text-white"
        >
          Plan <span className="text-[#8B7CFF]">together.</span>
          <br />
          Travel <span className="text-[#FF8A5C]">live.</span>
          <br />
          Remember <span className="text-[#E0B252]">it.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-7 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          One home for the whole trip — shared itinerary, group decisions,
          multi-currency splits with receipt scan, an offline day sheet, and
          a shareable Wrap when you're back. One link invites the crew.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-5 py-3 text-sm font-bold transition-colors"
          >
            <span
              aria-hidden
              className="absolute -inset-0.5 rounded-full bg-[#8B7CFF] opacity-0 group-hover:opacity-40 blur-md transition-opacity -z-10"
            />
            Start a trip
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
          <a
            href="#phases"
            className="inline-flex items-center rounded-full border border-white/15 hover:bg-white/[0.04] px-5 py-3 text-sm font-medium transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-7 flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-[13px] text-white/45"
        >
          <li className="flex items-center gap-1.5">
            <span className="text-[#9BC97E] font-bold">✓</span> Free — no card, ever
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[#9BC97E] font-bold">✓</span> Set up in 2 minutes
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-[#9BC97E] font-bold">✓</span> Crew joins with one link — no accounts
          </li>
        </motion.ul>
      </motion.div>

      {/* Phone composition with floating cards */}
      <motion.div
        style={{ y: phoneY }}
        className="relative mt-16 sm:mt-24"
      >
        <HeroPhone />
      </motion.div>

      {/* Destination photo strip */}
      <motion.div
        id="destinations"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="mt-24 sm:mt-32 max-w-7xl mx-auto scroll-mt-20"
      >
        <p className="text-center text-sm text-white/40 mb-6">
          Wherever the next one is
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute bottom-3 left-4 text-sm font-semibold tracking-wide text-white">
                {d.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

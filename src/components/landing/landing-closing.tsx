"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { WaitlistForm } from "./waitlist-form";

/**
 * Closing block + footer. Pure black, centered, flat. Matches the hero's
 * minimalism — no gradient cards, no shadow flourishes.
 */
export function LandingClosing() {
  return (
    <>
      <section id="pricing" className="relative border-t border-white/[0.06] py-32 px-6 overflow-hidden scroll-mt-20">
        {/* Soft warm aurora to close warmer than the cool indigo hero */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_50%,black_40%,transparent_80%)]"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-gradient-to-br from-amber-500/20 via-fuchsia-500/15 to-indigo-500/20 blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05]">
            Plan your{" "}
            <span className="bg-gradient-to-br from-amber-200 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent">
              first trip.
            </span>{" "}
            <span className="text-white/40">It's free.</span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-white/55 max-w-md mx-auto leading-relaxed">
            Invite your crew with one link. No accounts needed for guests.
            Multi-currency built in.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-6 py-3.5 text-sm font-semibold transition-colors"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <WaitlistForm />
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-white">
            <Logo variant="full" size="xs" />
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-xs">
              © {new Date().getFullYear()}
            </span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <a
              href="mailto:hello@paxawa.com"
              className="hover:text-white transition-colors"
            >
              hello@paxawa.com
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}

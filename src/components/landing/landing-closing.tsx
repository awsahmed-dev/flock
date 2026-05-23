"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Users } from "lucide-react";

/**
 * Closing block + footer. Final CTA card with a soft gradient + the legal
 * + social links. Kept slim — most footer content (changelog, blog, etc.)
 * doesn't exist yet so we don't fake it.
 */
export function LandingClosing() {
  return (
    <>
      <section className="relative py-32 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-fuchsia-600/20 p-10 sm:p-14 text-center"
        >
          <div
            aria-hidden
            className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[120%] h-[400px] rounded-full bg-indigo-500/30 blur-3xl pointer-events-none"
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              Your next trip starts here
            </h2>
            <p className="mt-4 text-white/70 leading-relaxed max-w-md mx-auto">
              Start free. Invite your crew with one link. No accounts needed for
              guests. Multi-currency built in.
            </p>
            <Link
              href="/auth/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-slate-900 hover:bg-white/90 px-6 py-3.5 text-sm font-bold shadow-xl transition-colors"
            >
              Plan your first trip
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight">Paxawa</span>
            <span className="text-white/30">·</span>
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

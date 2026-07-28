"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";

/**
 * Closing block + footer. Pure black, centered, flat. Matches the hero's
 * minimalism — no gradient cards, no shadow flourishes.
 */
export function LandingClosing() {
  return (
    <>
      <section className="relative border-t border-white/[0.06] py-32 px-6 overflow-hidden">
        {/* Soft warm aurora to close warmer than the cool indigo hero */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_50%,black_40%,transparent_80%)]"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-[#8B7CFF]/15 blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05]">
            The next trip{" "}
            <span className="text-[#8B7CFF]">starts here.</span>{" "}
            <span className="text-[#E0B252]">Sawa.</span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-white/55 max-w-md mx-auto leading-relaxed">
            Somebody in the crew has to set this up.
            <span className="text-white/80 font-semibold"> Be the hero — it takes two minutes.</span>
          </p>
          <ul className="mt-7 flex items-center justify-center gap-x-6 gap-y-2 flex-wrap text-[13px] text-white/45">
            <li><span className="text-[#9BC97E] font-bold">✓</span> Free forever</li>
            <li><span className="text-[#9BC97E] font-bold">✓</span> Guests join with a link</li>
            <li><span className="text-[#9BC97E] font-bold">✓</span> Works offline</li>
            <li><span className="text-[#9BC97E] font-bold">✓</span> English + العربية</li>
          </ul>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-6 py-3.5 text-sm font-bold transition-colors"
            >
              Start your trip — free
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/30">
            Your crew is going to plan this trip somewhere. Make it here.
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-white">
            <Logo variant="full" size="xs" />
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-xs">
              pax + sawa <span className="text-white/25">— travelers, together</span> · © {new Date().getFullYear()}
            </span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
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

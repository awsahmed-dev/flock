"use client";

import { motion } from "motion/react";

/**
 * Landing v3.2 — the name, explained.
 *
 * "Paxawa" reads as a made-up word until you split it: pax (airline
 * shorthand for travelers) + sawa (سوا — "together" in Arabic). Styled
 * as two dictionary entries that fuse into the wordmark, sitting right
 * before the closing CTA as the brand-story beat. Also quietly signals
 * the bilingual DNA of the product.
 */

export function NameStory() {
  return (
    <section className="relative border-t border-white/[0.06] py-24 sm:py-32 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-10 text-center"
        >
          Why &ldquo;Paxawa&rdquo;?
        </motion.p>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/[0.07] bg-[#161616] p-7 sm:p-8"
          >
            <p className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-[#8B7CFF]">
              pax
            </p>
            <p className="mt-2 text-sm text-white/40 italic">
              /paks/ · noun · airline shorthand
            </p>
            <p className="mt-4 text-white/70 leading-relaxed">
              <span className="font-semibold text-white">Travelers.</span>{" "}
              The word crews and pilots use for the people on board — you
              and your friends.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-3xl border border-white/[0.07] bg-[#161616] p-7 sm:p-8"
          >
            <p className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-[#E0B252]">
              sawa <span className="text-3xl sm:text-4xl align-middle">· سوا</span>
            </p>
            <p className="mt-2 text-sm text-white/40 italic">
              /sa·wa/ · Arabic
            </p>
            <p className="mt-4 text-white/70 leading-relaxed">
              <span className="font-semibold text-white">Together.</span>{" "}
              The word you hear in every Arabic group chat the moment a
              trip becomes real — &ldquo;نروح سوا&rdquo;, let&apos;s go together.
            </p>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 text-center text-2xl sm:text-4xl font-semibold tracking-[-0.03em] leading-snug"
        >
          <span className="text-[#8B7CFF]">Pax</span>
          <span className="text-white/30"> + </span>
          <span className="text-[#E0B252]">sawa</span>
          <span className="text-white/30"> = </span>
          <span className="text-white">travelers, together.</span>
          <span className="block mt-3 text-base sm:text-lg font-normal tracking-normal text-white/45">
            The name is the whole mission — pack sawa, travel sawa, remember it sawa.
          </span>
        </motion.p>
      </div>
    </section>
  );
}

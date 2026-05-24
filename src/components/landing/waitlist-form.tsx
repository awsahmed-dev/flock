"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Mail } from "lucide-react";
import { joinWaitlist } from "@/lib/actions/waitlist";

/**
 * Inline email-capture row for the landing closing. Single email input,
 * inline submit button, replaces itself with a confirmation row on
 * success. Stays graceful on dup-submit ("you're already in") and bad
 * email ("doesn't look right").
 *
 * Intentionally sized small — this isn't the primary CTA, it's a
 * fallback for visitors who aren't ready to sign up yet but want to
 * be reminded.
 */

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "ok"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("source", "landing-closing");
    startTransition(async () => {
      const res = await joinWaitlist(fd);
      setState(res.ok ? { kind: "ok", message: res.message } : { kind: "error", message: res.message });
    });
  }

  return (
    <div className="mt-10 max-w-md mx-auto">
      <p className="text-sm text-white/40 mb-3">
        Or just leave your email — we'll keep you posted
      </p>
      <AnimatePresence mode="wait">
        {state.kind === "ok" ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm font-medium text-emerald-300"
          >
            <Check className="w-4 h-4" />
            {state.message}
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={submit}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur p-1 pl-4 focus-within:border-white/25 transition-colors"
          >
            <Mail className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              placeholder="you@example.com"
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/30 outline-none py-2"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !email}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 text-xs font-bold transition-colors"
            >
              {isPending ? "…" : "Notify me"}
              <ArrowRight className="w-3 h-3" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {state.kind === "error" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-rose-300 mt-2 text-center"
        >
          {state.message}
        </motion.p>
      )}
    </div>
  );
}

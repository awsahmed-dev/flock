"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Trophy } from "lucide-react";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Interactive Vote demo. Three preloaded options with existing tallies.
 * Visitor casts a vote, the bars animate, the winner crown updates,
 * and a "your vote" badge appears next to the chosen option.
 *
 * They can switch their vote freely (re-tally) to feel out the model.
 * The "Total votes" counter at top updates live.
 */

type Option = { id: string; label: string; cost: string; base: number };

const QUESTION = "Which Airbnb should we pick?";

const OPTIONS: Option[] = [
  { id: "a", label: "Beachfront 3BR · $480/n", cost: "$480/n", base: 4 },
  { id: "b", label: "Mountain cabin · $320/n", cost: "$320/n", base: 1 },
  { id: "c", label: "Boutique hotel · $620/n", cost: "$620/n", base: 0 },
];

const TOTAL_VOTERS = 6;

export function VoteDemo() {
  const [chosen, setChosen] = useState<string | null>(null);

  // Compute live tallies based on user's vote
  const tallies = OPTIONS.map((o) => ({
    ...o,
    votes: o.base + (chosen === o.id ? 1 : 0),
  }));
  const totalVotes = tallies.reduce((s, t) => s + t.votes, 0);
  const winnerId = tallies.reduce((a, b) => (a.votes >= b.votes ? a : b)).id;

  return (
    <DemoFrame toneClass="from-violet-500/[0.07] to-blue-500/[0.04]">
      <DemoHeader title="Tokyo trip · open vote" subtitle="Closes in 2 days" />

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300 mb-3">
            📊 OPEN VOTE
          </div>
          <h4 className="text-lg font-semibold tracking-tight leading-snug text-white">
            {QUESTION}
          </h4>
          <p className="text-xs text-white/40 mt-1">
            {totalVotes} of {TOTAL_VOTERS} voted
          </p>
        </div>

        <div className="space-y-2">
          {tallies.map((o) => {
            const pct = totalVotes > 0 ? (o.votes / totalVotes) * 100 : 0;
            const isWinner = o.id === winnerId && o.votes > 0;
            const isMine = chosen === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setChosen(o.id === chosen ? null : o.id)}
                className={`relative w-full text-left rounded-xl border overflow-hidden p-3 transition-colors ${
                  isMine
                    ? "border-violet-400/60 bg-violet-500/10"
                    : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                {/* Tally bar */}
                <motion.div
                  className={`absolute inset-y-0 left-0 ${
                    isWinner
                      ? "bg-gradient-to-r from-emerald-500/15 to-emerald-500/5"
                      : "bg-white/[0.04]"
                  }`}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, type: "spring", damping: 18 }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isMine
                          ? "border-violet-300 bg-violet-400"
                          : "border-white/30"
                      }`}
                    >
                      {isMine && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <span className="text-sm font-semibold text-white truncate">
                      {o.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isWinner && o.votes > 0 && (
                      <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span className="text-xs font-bold text-white/80 tabular-nums">
                      {o.votes}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {chosen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-center"
            >
              <p className="text-xs text-white/40">
                Tap an option to switch your vote
              </p>
            </motion.div>
          )}
          {!chosen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-center"
            >
              <p className="text-xs text-violet-300">
                ↑ Cast your vote — see the bars move
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoFrame>
  );
}

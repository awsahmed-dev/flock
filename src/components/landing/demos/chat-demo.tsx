"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, Calendar, Wallet, Vote } from "lucide-react";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Interactive Chat demo — the marquee one.
 *
 * The user types in the input (or clicks a suggested prompt), hits send,
 * and watches:
 *   1. Their message appears as a user bubble.
 *   2. ~700ms later the "AI smart action chips" appear under it — matching
 *      the real product behavior we shipped in Sprint 3.
 *   3. Tapping a chip "creates" the corresponding artifact (just visually —
 *      we don't hit the DB from the marketing page).
 *
 * Resets on input clear. Pre-seeded with 2 messages so it looks lived-in.
 */

type Msg = {
  id: string;
  from: "maya" | "me";
  body: string;
  chips?: ChipKind[];
};

type ChipKind = "plan" | "expense" | "vote";

const SUGGESTED = [
  "let's do dinner at Sushi Yoshino at 8 tomorrow $40 each",
  "Anyone want to vote on hotel vs Airbnb?",
  "Paid €120 for the Uber, can someone split it?",
];

const SEED: Msg[] = [
  { id: "1", from: "maya", body: "Just landed! who's free for lunch?" },
  { id: "2", from: "me", body: "Same. Tacos at El Vilsito?" },
];

// Cheap heuristic — same idea as the real Claude Haiku detector but
// scripted for the marketing context. No tokens spent.
function detectChips(text: string): ChipKind[] {
  const t = text.toLowerCase();
  const out: ChipKind[] = [];
  if (/(\$|€|£|\d+\s?(usd|eur|gbp))/.test(t) || /paid|owe|split/.test(t)) {
    out.push("expense");
  }
  if (/vote|or |which|pick|choose|hotel|airbnb/.test(t)) {
    out.push("vote");
  }
  if (
    /dinner|breakfast|lunch|restaurant|stay|hotel|airbnb|book|reserve|at \d/.test(
      t,
    )
  ) {
    out.push("plan");
  }
  return out.length > 0 ? out.slice(0, 2) : ["plan"];
}

const CHIP_META: Record<
  ChipKind,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  plan: { icon: Calendar, label: "Add to plan" },
  expense: { icon: Wallet, label: "Log expense" },
  vote: { icon: Vote, label: "Open a vote" },
};

export function ChatDemo() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = String(Date.now());
    setMessages((prev) => [...prev, { id, from: "me", body: trimmed }]);
    setInput("");

    // Mimic the real product: 700ms later, AI chips appear under the bubble.
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, chips: detectChips(trimmed) } : m,
        ),
      );
    }, 700);
  }

  function applyChip(kind: ChipKind, messageId: string) {
    const labels: Record<ChipKind, string> = {
      plan: "Added to itinerary",
      expense: "Expense logged · split 4 ways",
      vote: "Vote opened — crew notified",
    };
    setAppliedNotice(labels[kind]);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, chips: undefined } : m)),
    );
    setTimeout(() => setAppliedNotice(null), 2200);
  }

  function suggest(text: string) {
    setInput(text);
  }

  return (
    <DemoFrame toneClass="from-violet-500/[0.07] to-fuchsia-500/[0.04]">
      <DemoHeader title="Tokyo trip · live" subtitle="Chat · 4 online" />

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onChip={applyChip} />
        ))}
        {messages.length === SEED.length && (
          <SuggestionRow onPick={suggest} prompts={SUGGESTED} />
        )}
      </div>

      {/* Applied notice */}
      <AnimatePresence>
        {appliedNotice && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-20 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 backdrop-blur px-3 py-1.5 text-xs font-semibold text-emerald-300"
          >
            ✨ {appliedNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="px-3 py-3 border-t border-white/[0.06] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try it — type a message"
          className="flex-1 min-w-0 bg-white/[0.04] rounded-full px-4 py-2 text-sm placeholder:text-white/30 text-white outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-white/20 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          aria-label="Send"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </DemoFrame>
  );
}

/* ─── Bubble + chips ─────────────────────────────────────────────── */

function MessageBubble({
  msg,
  onChip,
}: {
  msg: Msg;
  onChip: (k: ChipKind, msgId: string) => void;
}) {
  const isMine = msg.from === "me";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        {!isMine && (
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 px-1">
            <div className="w-4 h-4 rounded-full bg-emerald-500/70 flex items-center justify-center text-[8px] font-bold text-white">
              M
            </div>
            Maya
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`rounded-2xl px-3.5 py-2 text-sm leading-snug ${
            isMine
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-md"
              : "bg-white/[0.08] text-white/90 rounded-tl-md"
          }`}
        >
          {msg.body}
        </motion.div>

        {/* AI chips */}
        <AnimatePresence>
          {msg.chips && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 flex-wrap mt-0.5"
            >
              <Sparkles className="w-3 h-3 text-indigo-300 ml-1" />
              {msg.chips.map((k) => {
                const meta = CHIP_META[k];
                const Icon = meta.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChip(k, msg.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 transition-colors"
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {meta.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SuggestionRow({
  onPick,
  prompts,
}: {
  onPick: (s: string) => void;
  prompts: string[];
}) {
  return (
    <div className="pt-3 border-t border-white/[0.04]">
      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-1">
        try one
      </p>
      <div className="flex flex-col gap-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="text-left text-xs text-white/60 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors"
          >
            "{p}"
          </button>
        ))}
      </div>
    </div>
  );
}

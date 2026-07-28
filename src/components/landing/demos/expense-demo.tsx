"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Receipt } from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Interactive Expense demo. Visitor types an amount, picks a currency,
 * and the demo splits it across a fixed 4-member crew live. They can
 * also pick who paid — the "You owe / You paid" cards update in real time.
 *
 * Pre-seeded with two prior expenses to give the running balance some
 * baseline rather than starting from zero.
 */

const CREW = [
  { id: "you", name: "You", color: "from-indigo-500 to-violet-600" },
  { id: "maya", name: "Maya", color: "from-[#9BC97E] to-teal-600" },
  { id: "alex", name: "Alex", color: "from-amber-500 to-orange-600" },
  { id: "sam", name: "Sam", color: "from-rose-500 to-pink-600" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

// Pre-existing balance state — what "You paid / You owe" cards show before
// any demo input. Just numbers for visual flavor.
const BASE_YOU_PAID = 480;
const BASE_YOU_OWE = 120;

export function ExpenseDemo() {
  const [amount, setAmount] = useState<string>("200");
  const [currency, setCurrency] = useState("USD");
  const [paidBy, setPaidBy] = useState("you");
  const [title, setTitle] = useState("Sushi dinner");

  const amt = parseFloat(amount) || 0;
  const perPerson = amt / CREW.length;

  const youPaid = useMemo(
    () => BASE_YOU_PAID + (paidBy === "you" ? amt : 0),
    [paidBy, amt],
  );
  const youOwe = useMemo(
    () => BASE_YOU_OWE + (paidBy !== "you" ? perPerson : 0),
    [paidBy, perPerson],
  );

  return (
    <DemoFrame toneClass="from-[#9BC97E]/[0.07] to-[#3EC5B7]/[0.04]">
      <DemoHeader title="Tokyo trip · expenses" subtitle="Log a new spend" />

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Balance cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-white/40 font-bold uppercase mb-1">
              <ArrowUpRight className="w-3 h-3 text-[#9BC97E]" />
              You paid
            </div>
            <motion.p
              key={youPaid}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold tabular-nums text-[#B8DBA1]"
            >
              {currency} {youPaid.toFixed(0)}
            </motion.p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-white/40 font-bold uppercase mb-1">
              <ArrowDownRight className="w-3 h-3 text-[#FF8A5C]" />
              You owe
            </div>
            <motion.p
              key={youOwe}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold tabular-nums text-[#FF8A5C]"
            >
              {currency} {youOwe.toFixed(0)}
            </motion.p>
          </div>
        </div>

        {/* Inline form */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#9BC97E]" />
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">
              New expense
            </p>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What for?"
            className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/30 outline-none border-b border-white/[0.06] focus:border-[#9BC97E]/40 transition-colors pb-1.5"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-white tabular-nums placeholder:text-white/20 outline-none"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-white/[0.06] text-xs font-bold text-white/80 rounded-md px-2 outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] tracking-wider font-bold text-white/40 uppercase mb-1.5">
              Paid by
            </p>
            <div className="flex items-center gap-1.5">
              {CREW.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                    paidBy === m.id
                      ? "bg-white text-black"
                      : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Split preview */}
        <div>
          <p className="text-[10px] tracking-wider font-bold text-white/40 uppercase mb-2">
            Split equally · {CREW.length} ways
          </p>
          <div className="space-y-1.5">
            {CREW.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] font-bold text-white`}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <span className="text-sm text-white/90">{m.name}</span>
                  {paidBy === m.id && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#B8DBA1] bg-[#9BC97E]/15 rounded-full px-1.5 py-0.5">
                      paid
                    </span>
                  )}
                </div>
                <motion.span
                  key={`${m.id}-${perPerson}`}
                  initial={{ opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-bold tabular-nums text-white"
                >
                  {currency} {perPerson.toFixed(0)}
                </motion.span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#B8DBA1]">
          ↑ Try changing the amount or payer
        </p>
      </div>
    </DemoFrame>
  );
}

"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Check, Users, User, UsersThree as UsersRound } from "@phosphor-icons/react/dist/ssr";
import { DemoFrame, DemoHeader } from "./demo-frame";

/**
 * Interactive Packing demo. Three-tab pill switcher matching the real
 * product (Shared / Yours / Crew). Visitor can toggle items in Shared
 * + Yours; Crew tab is a read-only roll-up showing two other members'
 * progress.
 *
 * Progress bar at the top reflects the active tab's packed/total count
 * and animates smoothly between tab switches.
 */

type Tab = "shared" | "yours" | "crew";

interface PackingItem {
  id: string;
  label: string;
  category: string;
  packed: boolean;
}

const SHARED_INITIAL: PackingItem[] = [
  { id: "s1", label: "First-aid kit", category: "Medical", packed: true },
  { id: "s2", label: "Power bank", category: "Tech", packed: true },
  { id: "s3", label: "Universal adapter", category: "Tech", packed: false },
  { id: "s4", label: "Snacks for the flight", category: "General", packed: false },
  { id: "s5", label: "Camera with extra battery", category: "Tech", packed: true },
];

const YOURS_INITIAL: PackingItem[] = [
  { id: "y1", label: "Passport", category: "Docs", packed: true },
  { id: "y2", label: "Travel insurance card", category: "Docs", packed: true },
  { id: "y3", label: "Phone charger", category: "Tech", packed: false },
  { id: "y4", label: "Sunscreen", category: "Toiletries", packed: false },
];

const CREW = [
  {
    name: "Maya",
    color: "from-emerald-500 to-teal-600",
    items: [
      { label: "Passport", packed: true },
      { label: "Camera lens", packed: true },
      { label: "Hiking boots", packed: false },
      { label: "Phrase book", packed: false },
    ],
  },
  {
    name: "Alex",
    color: "from-amber-500 to-orange-600",
    items: [
      { label: "Passport", packed: true },
      { label: "Sunglasses", packed: true },
      { label: "Swim trunks", packed: true },
      { label: "GoPro mounts", packed: true },
      { label: "Travel insurance", packed: false },
    ],
  },
];

export function PackingDemo() {
  const [tab, setTab] = useState<Tab>("shared");
  const [shared, setShared] = useState(SHARED_INITIAL);
  const [yours, setYours] = useState(YOURS_INITIAL);

  const counts = useMemo(() => {
    const sharedPacked = shared.filter((i) => i.packed).length;
    const yoursPacked = yours.filter((i) => i.packed).length;
    return {
      shared: { packed: sharedPacked, total: shared.length },
      yours: { packed: yoursPacked, total: yours.length },
      crew: {
        packed: CREW.reduce((s, m) => s + m.items.filter((i) => i.packed).length, 0),
        total: CREW.reduce((s, m) => s + m.items.length, 0),
      },
    };
  }, [shared, yours]);

  const active = counts[tab];
  const pct = active.total > 0 ? (active.packed / active.total) * 100 : 0;

  function toggle(scope: "shared" | "yours", id: string) {
    const setter = scope === "shared" ? setShared : setYours;
    setter((prev) =>
      prev.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)),
    );
  }

  return (
    <DemoFrame toneClass="from-amber-500/[0.07] to-orange-500/[0.04]">
      <DemoHeader title="Tokyo trip · packing" subtitle="6 days to go" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] w-fit">
          <TabPill
            active={tab === "shared"}
            onClick={() => setTab("shared")}
            icon={Users}
            label="Shared"
            count={counts.shared.total}
          />
          <TabPill
            active={tab === "yours"}
            onClick={() => setTab("yours")}
            icon={User}
            label="Yours"
            count={counts.yours.total}
          />
          <TabPill
            active={tab === "crew"}
            onClick={() => setTab("crew")}
            icon={UsersRound}
            label="Crew"
            count={CREW.length}
          />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="text-white/40 font-medium">
              {active.packed} of {active.total} packed
            </span>
            <span className="font-bold tabular-nums text-white">
              {Math.round(pct)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Body */}
        {tab === "shared" && (
          <ItemList
            items={shared}
            onToggle={(id) => toggle("shared", id)}
          />
        )}
        {tab === "yours" && (
          <ItemList
            items={yours}
            onToggle={(id) => toggle("yours", id)}
          />
        )}
        {tab === "crew" && <CrewView />}

        {tab !== "crew" && (
          <p className="text-center text-xs text-amber-300/80 pt-1">
            ↑ Tap a row to check it off
          </p>
        )}
      </div>
    </DemoFrame>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function TabPill({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
        active
          ? "bg-white text-black"
          : "text-white/50 hover:text-white/80"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
      <span
        className={`text-[9px] tabular-nums rounded-full px-1.5 ${
          active ? "bg-black/10" : "bg-white/[0.06]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ItemList({
  items,
  onToggle,
}: {
  items: PackingItem[];
  onToggle: (id: string) => void;
}) {
  // Group by category for visual rhythm.
  const grouped = useMemo(() => {
    const map = new Map<string, PackingItem[]>();
    for (const i of items) {
      const list = map.get(i.category) ?? [];
      list.push(i);
      map.set(i.category, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-3">
      {grouped.map(([cat, list]) => (
        <section key={cat}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 px-1">
            {cat}
          </p>
          <div className="space-y-1.5">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                  item.packed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                    item.packed
                      ? "bg-emerald-400"
                      : "border-2 border-white/30"
                  }`}
                >
                  {item.packed && <Check className="w-2.5 h-2.5 text-black" />}
                </div>
                <span
                  className={`text-xs font-medium text-left ${
                    item.packed
                      ? "line-through text-white/40"
                      : "text-white/90"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CrewView() {
  return (
    <div className="space-y-2.5">
      {CREW.map((m) => {
        const packed = m.items.filter((i) => i.packed).length;
        const pct = (packed / m.items.length) * 100;
        return (
          <div
            key={m.name}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                >
                  {m.name.charAt(0)}
                </div>
                <p className="text-xs font-bold text-white truncate">
                  {m.name}
                </p>
              </div>
              <p className="text-[10px] font-bold tabular-nums text-white/60 shrink-0">
                {packed}/{m.items.length}
              </p>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {m.items.slice(0, 3).map((i, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                    i.packed
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/[0.04] text-white/40"
                  }`}
                >
                  {i.packed ? "✓" : "·"} {i.label}
                </span>
              ))}
              {m.items.length > 3 && (
                <span className="text-[10px] text-white/30 px-1.5 py-0.5">
                  +{m.items.length - 3} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

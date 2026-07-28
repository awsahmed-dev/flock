"use client";

import { motion } from "motion/react";
import { Calendar, Wallet, CheckSquareOffset as Vote, Chat as MessageSquare, MapPin, Buildings as Hotel, ForkKnife as Utensils, Airplane as Plane } from "@phosphor-icons/react/dist/ssr";

/**
 * Hero centerpiece — JobSeekr-style. A flat black phone-ish frame in the
 * middle showing a fake "Tokyo trip" dashboard, with four floating cards
 * arranged around it that subtly pop on hover.
 *
 * No notch, no bezel chrome, no shadow gimmick. Just rounded panels and
 * type, in the same flat 2026 voice as the rest of the page. The float
 * animations are scroll-respecting via motion (they idle in place when
 * out of view).
 */

export function HeroPhone() {
  return (
    <div className="relative w-full max-w-[920px] mx-auto h-[560px] sm:h-[640px]">
      {/* Floating cards — corners. Tilted and idle-bobbing. */}
      <FloatingCard
        className="hidden lg:block top-6 -left-4"
        delay={0.1}
        rotate={-4}
      >
        <ItineraryCard />
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block top-2 -right-2"
        delay={0.25}
        rotate={5}
      >
        <VoteCard />
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block bottom-12 -left-6"
        delay={0.4}
        rotate={-7}
      >
        <ExpenseCard />
      </FloatingCard>

      <FloatingCard
        className="hidden lg:block bottom-4 -right-0"
        delay={0.55}
        rotate={4}
      >
        <ChatCard />
      </FloatingCard>

      {/* Center "phone" panel — the dashboard preview */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[360px]"
      >
        <CenterDashboard />
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function FloatingCard({
  children,
  className,
  delay,
  rotate,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
  rotate: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: rotate * 1.5 }}
      animate={{
        opacity: 1,
        y: [0, -8, 0],
        rotate,
      }}
      transition={{
        opacity: { duration: 0.7, delay },
        rotate: { duration: 0.7, delay },
        y: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
      }}
      whileHover={{
        scale: 1.04,
        rotate: 0,
        transition: { duration: 0.25 },
      }}
      className={`absolute ${className} z-10`}
    >
      {children}
    </motion.div>
  );
}

/* ─── Center dashboard ──────────────────────────────────────────────── */

function CenterDashboard() {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-md p-5 shadow-[0_30px_80px_-20px_rgba(99,102,241,0.35)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6D5AE6] to-[#8B7CFF] flex items-center justify-center">
          <Plane className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            Tokyo with the crew
          </p>
          <p className="text-[10px] text-white/40 truncate">
            Mar 14 – Mar 21 · 6 travelers
          </p>
        </div>
        <AvatarStack />
      </div>

      {/* Today */}
      <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mb-2">
        Today · Day 3
      </p>
      <div className="space-y-1.5 mb-4">
        <DashRow
          icon={<Hotel className="w-3.5 h-3.5 text-[#3EC5B7]" />}
          title="Park Hotel Tokyo"
          meta="Check-in 3pm · Shiodome"
        />
        <DashRow
          icon={<Utensils className="w-3.5 h-3.5 text-[#9BC97E]" />}
          title="Sushi Yoshino"
          meta="8pm · Tsukiji"
          highlight
        />
        <DashRow
          icon={<MapPin className="w-3.5 h-3.5 text-[#8B7CFF]" />}
          title="Shibuya Sky"
          meta="10pm · ~¥2,500/person"
        />
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
        <DashStat label="Spent" value="$1,540" tint="text-white" />
        <DashStat label="You owe" value="$84" tint="text-[#FF8A5C]" />
        <DashStat label="To plan" value="2 days" tint="text-white/60" />
      </div>
    </div>
  );
}

function DashRow({
  icon,
  title,
  meta,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
        highlight
          ? "bg-gradient-to-r from-[#9BC97E]/10 to-transparent ring-1 ring-emerald-500/20"
          : "hover:bg-white/[0.03]"
      } transition-colors`}
    >
      <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{title}</p>
        <p className="text-[10px] text-white/40 truncate">{meta}</p>
      </div>
    </div>
  );
}

function DashStat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-wider font-bold text-white/30">
        {label}
      </p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${tint}`}>{value}</p>
    </div>
  );
}

function AvatarStack() {
  const colors = [
    "from-[#6D5AE6] to-[#8B7CFF]",
    "from-[#7FA968] to-[#3EC5B7]",
    "from-[#E0B252] to-[#FF8A5C]",
  ];
  return (
    <div className="flex -space-x-1.5">
      {colors.map((c, i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full bg-gradient-to-br ${c} border-2 border-black`}
        />
      ))}
      <div className="w-5 h-5 rounded-full bg-white/10 border-2 border-black text-[8px] font-bold text-white/80 flex items-center justify-center">
        +3
      </div>
    </div>
  );
}

/* ─── Floating mini-cards ───────────────────────────────────────────── */

function ItineraryCard() {
  return (
    <div className="w-[210px] rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-md p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Calendar className="w-3 h-3 text-[#3EC5B7]" />
        <p className="text-[10px] tracking-wider uppercase font-bold text-[#7BDCD1]">
          Plan · Day 2
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#9BC97E]" />
          <p className="text-xs font-semibold text-white">teamLab Borderless</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E0B252]" />
          <p className="text-xs font-semibold text-white/80">Ramen at Ichiran</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <p className="text-xs font-semibold text-white/50">Karaoke night?</p>
        </div>
      </div>
    </div>
  );
}

function VoteCard() {
  return (
    <div className="w-[230px] rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-md p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Vote className="w-3 h-3 text-[#8B7CFF]" />
        <p className="text-[10px] tracking-wider uppercase font-bold text-[#B3A8FF]">
          Open vote
        </p>
      </div>
      <p className="text-xs font-semibold text-white mb-2.5 leading-snug">
        Beachfront or mountain Airbnb?
      </p>
      <div className="space-y-1.5">
        <div className="relative h-6 rounded-md bg-white/[0.04] overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-r from-[#8B7CFF]/40 to-[#8B7CFF]/20" />
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold text-white">
            <span>Beachfront</span>
            <span>4</span>
          </div>
        </div>
        <div className="relative h-6 rounded-md bg-white/[0.04] overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[20%] bg-white/[0.06]" />
          <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-semibold text-white/60">
            <span>Mountain</span>
            <span>1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseCard() {
  return (
    <div className="w-[220px] rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-md p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Wallet className="w-3 h-3 text-[#9BC97E]" />
        <p className="text-[10px] tracking-wider uppercase font-bold text-[#9BC97E]">
          Expense · split 4
        </p>
      </div>
      <p className="text-sm font-semibold text-white">Hotel Tulum · 3 nights</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-xs text-white/40">Maya paid</p>
        <p className="text-base font-bold tabular-nums text-[#9BC97E]">
          $480
        </p>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          You owe
        </p>
        <p className="text-xs font-bold tabular-nums text-[#FF8A5C]">$120</p>
      </div>
    </div>
  );
}

function ChatCard() {
  // Point-and-Split — the receipt-scan moment, Money's moss accents.
  return (
    <div className="w-[230px] rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-md p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <MessageSquare className="w-3 h-3 text-[#9BC97E]" />
        <p className="text-[10px] tracking-wider uppercase font-bold text-[#B8DBA1]">
          Point-and-Split
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-white/80">
          📷 Receipt scanned — ¥12,400
        </div>
        <div className="bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60">
          Izakaya dinner · split 4 ways
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#9BC97E]/40 bg-[#9BC97E]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#B8DBA1]">
            ✓ Logged · ¥3,100 each
          </span>
        </div>
      </div>
    </div>
  );
}

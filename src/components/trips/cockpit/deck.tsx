"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/locale-provider";
import type { DeckCard } from "@/lib/deck";
import { Heart, CalendarDots, Sun, CurrencyCircleDollar, Wallet, Users, FileText, ChatCircle, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { UserAvatar } from "@/components/ui/user-avatar";

/**
 * Now redesign, step 4 — one photo, then notes.
 *
 * HeroCard: the deck's single image (the card that EARNS one — a hearted place,
 * day 1 over the trip photo). NoteRow: one line — hue tile · title · meta ·
 * one-word action; the purpose line and long body stay hidden until tap.
 * DeckFooter: faces + the numbers that used to be three metric cells.
 */
const ICONS = { Heart, CalendarDots, Sun, CurrencyCircleDollar, Wallet, Users, FileText, ChatCircle } as const;

function useCardCopy(c: DeckCard) {
  const t = useT();
  const p = { ...c.params, cond: c.params.cond ? t(String(c.params.cond)) : "" };
  return {
    purpose: t(c.purposeKey, p),
    kicker: c.kickerKey ? t(c.kickerKey, p) : null,
    title: t(c.titleKey, p),
    body: t(c.bodyKey, p),
    action: t(c.actionKey, p),
  };
}

export function HeroCard({ card }: { card: DeckCard }) {
  const { purpose, kicker, title, body, action } = useCardCopy(card);
  const Icon = ICONS[card.icon];
  const hue = `var(--clr-${card.hue})`;
  return (
    <Link
      href={card.href}
      className="relative block overflow-hidden rounded-3xl border border-border h-[176px] active:scale-[0.99] transition-transform"
      style={{ backgroundImage: card.photoUrl ? `url(${card.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--card)" }}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.85) 100%)" }} />
      <span className="absolute top-3 start-3 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white/90 flex items-center gap-1">
        <Icon size={12} weight="fill" style={{ color: hue }} />
        {purpose}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end justify-between gap-3 text-white">
        <div className="min-w-0">
          {kicker && <p className="text-[10px] font-black tracking-wider uppercase" style={{ color: hue }}>{kicker}</p>}
          <p className="text-[18px] font-bold leading-tight truncate">{title}</p>
          <p className="text-[12px] text-white/75 truncate">{body}</p>
        </div>
        <span className="shrink-0 rounded-full px-3.5 h-9 flex items-center text-[13px] font-bold text-[color:var(--ticket-fg)]" style={{ background: hue }}>{action}</span>
      </div>
    </Link>
  );
}

export function NoteRow({ card }: { card: DeckCard }) {
  const { purpose, title, body, action } = useCardCopy(card);
  const Icon = ICONS[card.icon];
  const hue = `var(--clr-${card.hue})`;
  return (
    <Link href={card.href} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 active:scale-[0.99] transition-transform" title={purpose}>
      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)` }}>
        <Icon size={17} weight="fill" style={{ color: hue }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight truncate">{title}</span>
        <span className="block text-[12px] text-muted-foreground truncate">{body}</span>
      </span>
      <span className="text-[12px] font-bold shrink-0 flex items-center gap-0.5" style={{ color: hue }}>
        {action} <CaretRight size={11} weight="bold" className="rtl:rotate-180" />
      </span>
    </Link>
  );
}

export function DeckFooter({
  crew, text,
}: { crew: { userId: string; displayName: string; avatarUrl: string | null }[]; text: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 pt-1">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {crew.slice(0, 4).map((m) => (
          <span key={m.userId} className="ring-2 ring-background rounded-full"><UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="sm" /></span>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground truncate">{text}</p>
    </div>
  );
}

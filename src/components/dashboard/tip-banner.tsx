"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Lightbulb } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Video round 3: "there are no banners teaching the user… a small educational
 * banner." One quiet line, rotating through the things people don't discover
 * on their own; dismiss hides it for a week.
 */
const TIPS: { key: string; href?: string }[] = [
  { key: "forward" },
  { key: "hearts" },
  { key: "pocket" },
  { key: "split" },
];
const KEY = "paxawa-tip-dismissed-until";

export function TipBanner({ tripHref }: { tripHref: string | null }) {
  const t = useT();
  const [idx, setIdx] = useState<number | null>(null);
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(KEY) ?? 0);
      if (until > Date.now()) return;
    } catch { /* ignore */ }
    // rotate by day so the same person sees a different tip tomorrow
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only, reads localStorage
    setIdx(Math.floor(Date.now() / 86_400_000) % TIPS.length);
  }, []);
  if (idx == null) return null;
  const tip = TIPS[idx];
  const href = tip.key === "forward" ? (tripHref ? `${tripHref}/documents` : null)
    : tip.key === "hearts" ? (tripHref ? `${tripHref}/discover` : null)
    : tip.key === "split" ? (tripHref ? `${tripHref}/money` : null)
    : null;
  const body = (
    <>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--clr-dune) 18%, transparent)" }}>
        <Lightbulb size={16} weight="fill" style={{ color: "var(--clr-dune)" }} />
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
        <span className="font-bold">{t(`tips.${tip.key}.title`)}</span>
        <span className="text-muted-foreground"> — {t(`tips.${tip.key}.body`)}</span>
      </span>
    </>
  );
  return (
    <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-2xl border border-border bg-card ps-2.5 pe-1.5 py-2">
      {href ? <Link href={href} className="flex items-center gap-2.5 min-w-0 flex-1">{body}</Link> : <div className="flex items-center gap-2.5 min-w-0 flex-1">{body}</div>}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => { try { localStorage.setItem(KEY, String(Date.now() + 7 * 86_400_000)); } catch { /* ignore */ } setIdx(null); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

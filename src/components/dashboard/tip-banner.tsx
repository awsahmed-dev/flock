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
  // Video round 4: "more of a note than a banner" — it is a banner now: a
  // brand gradient card, a real icon, a 14px title, and a CTA.
  const inner = (
    <div
      className="relative overflow-hidden rounded-2xl px-4 py-3.5 flex items-center gap-3 text-white"
      style={{ background: "linear-gradient(135deg, var(--clr-brand) 0%, #7C6CFF 55%, #A78BFA 100%)" }}
    >
      <span className="w-11 h-11 rounded-2xl bg-white/18 backdrop-blur flex items-center justify-center shrink-0">
        <Lightbulb size={22} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold tracking-wider uppercase text-white/75">{t("tips.kicker")}</span>
        <span className="block text-[14px] font-bold leading-tight mt-0.5">{t(`tips.${tip.key}.title`)}</span>
        <span className="block text-[12px] text-white/85 leading-snug mt-0.5 line-clamp-2">{t(`tips.${tip.key}.body`)}</span>
      </span>
      {href && (
        <span className="shrink-0 h-9 px-3.5 rounded-full bg-white text-[13px] font-bold inline-flex items-center" style={{ color: "var(--clr-brand)" }}>
          {t("tips.cta")}
        </span>
      )}
      <span aria-hidden className="absolute -end-6 -top-8 w-28 h-28 rounded-full bg-white/10" />
    </div>
  );
  return (
    <div className="relative mx-4 mb-4">
      {href ? <Link href={href} className="block">{inner}</Link> : inner}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => { try { localStorage.setItem(KEY, String(Date.now() + 7 * 86_400_000)); } catch { /* ignore */ } setIdx(null); }}
        className="absolute top-1.5 end-1.5 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}

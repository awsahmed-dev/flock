"use client";

import { Sparkle as Sparkles, Users, CheckSquareOffset as Vote, Wallet } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import { NewTripTrigger } from "@/components/trips/new-trip-trigger";

/**
 * First-run onboarding for the dashboard — shown INSTEAD of the bare
 * "No trips yet" empty state when the user has zero trips.
 *
 * Why one screen instead of a multi-step tour: the only "step" that
 * actually does anything is the first trip creation. Everything else
 * (invite crew, AI plan, vote, expense) only becomes meaningful inside a
 * trip. Set the expectation, get them through the first action.
 *
 * History (first-run Finding 8): this component existed, was translated in
 * spirit but hard-coded in English, and had ZERO live importers — its only
 * importer (TripGrid) had none either, and its CTA pointed at /trips/new,
 * a second create-trip form reachable only from itself. All of that is
 * deleted; the CTA is the same sheet the rest of the app uses.
 */
const STEPS = [
  { icon: Users, key: "crew", iconBg: "bg-blue-100 dark:bg-blue-950/30", iconColor: "text-blue-600 dark:text-blue-400" },
  { icon: Sparkles, key: "ai", iconBg: "bg-violet-100 dark:bg-violet-950/30", iconColor: "text-violet-600 dark:text-violet-400" },
  { icon: Wallet, key: "money", iconBg: "bg-emerald-100 dark:bg-emerald-950/30", iconColor: "text-emerald-600 dark:text-emerald-400" },
] as const;

export function OnboardingCard() {
  const t = useT();
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-primary/5 p-6 sm:p-10 overflow-hidden relative">
      <div aria-hidden className="absolute -end-16 -top-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -start-20 -bottom-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="max-w-xl mb-8">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
            <Sparkles className="w-4 h-4" />
            {t("onboarding.eyebrow")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{t("onboarding.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t("onboarding.subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {t("onboarding.step", { n: i + 1 })}
                  </span>
                </div>
                <p className="text-sm font-bold leading-snug">{t(`onboarding.${s.key}Title`)}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(`onboarding.${s.key}Body`)}</p>
              </div>
            );
          })}
        </div>

        <NewTripTrigger variant="inline" label={t("onboarding.cta")} />

        <p className="text-[12px] text-muted-foreground mt-3 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><Vote className="w-4 h-4" /> {t("onboarding.tagVoting")}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Wallet className="w-4 h-4" /> {t("onboarding.tagSplitting")}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="w-4 h-4" /> {t("onboarding.tagAi")}</span>
        </p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your Paxawa account.",
  robots: { index: false, follow: false },
};

import { ResetForm } from "@/components/auth/reset-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function ResetPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);
  return (
    <AuthShell
      subtitle={t("auth.resetHero")}
      boarding={t("auth.resetBoarding")}
      tagline={t("auth.tagline")}
    >
      <ResetForm />
    </AuthShell>
  );
}

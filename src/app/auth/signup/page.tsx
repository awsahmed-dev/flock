export const dynamic = "force-dynamic";

import type { Metadata } from "next";

// Launch audit §6: real title/description instead of the site default.
export const metadata: Metadata = {
  title: "Sign up free",
  description:
    "Create a free Paxawa account in minutes — no password needed. Plan the trip together, vote on places, and split every expense with your crew.",
};

import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function SignupPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);
  return (
    <AuthShell subtitle={t("auth.signupHero")} boarding={t("auth.signupBoarding")} tagline={t("auth.tagline")}>
      <SignupForm />
      <p className="text-center text-sm text-[#141414]/55 mt-6">
        {t("auth.haveAccount")}{" "}
        <Link href="/auth/login" className="text-[#5B4BD9] font-semibold hover:underline">
          {t("auth.signInLink")}
        </Link>
      </p>
    </AuthShell>
  );
}

export const dynamic = "force-dynamic";

import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function SignupPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);
  return (
    <AuthShell subtitle={t("auth.signupHero")} boarding={t("auth.signupBoarding")}>
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

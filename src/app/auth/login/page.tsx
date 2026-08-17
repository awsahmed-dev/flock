export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string) => tFromDict(dict, k, undefined, locale);
  return (
    <AuthShell subtitle={t("auth.loginHero")} boarding={t("auth.loginBoarding")}>
      <LoginForm />
      <p className="text-center text-sm text-[#141414]/55 mt-6">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/signup" className="text-[#5B4BD9] font-semibold hover:underline">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </AuthShell>
  );
}

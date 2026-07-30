export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell subtitle="أهلًا بعودتك ✈" boarding="Re-boarding · تسجيل الدخول">
      <LoginForm />
      <p className="text-center text-sm text-[#141414]/55 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-[#5B4BD9] font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

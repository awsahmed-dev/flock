export const dynamic = "force-dynamic";

import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell subtitle="أنشئ حسابك ونروح سوا ✈" boarding="Now boarding · الصعود الآن">
      <SignupForm />
      <p className="text-center text-sm text-[#141414]/55 mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#5B4BD9] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

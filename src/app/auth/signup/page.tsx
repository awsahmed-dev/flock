export const dynamic = "force-dynamic";

import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

export default function SignupPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none -z-10 [mask-image:radial-gradient(70%_70%_at_50%_50%,black_40%,transparent_85%)]"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-primary/15 via-primary/20 to-amber-500/10 blur-[100px]" />
      </div>
      <div className="fixed top-4 end-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Link
            href="/"
            className="flex items-center text-foreground"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="md" />
          </Link>
          <p className="text-muted-foreground text-sm">Create your account</p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

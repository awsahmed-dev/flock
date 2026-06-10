export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* B25-2: soft aurora backdrop instead of flat bg-muted/20 — gives
          the auth screens a sense of place that matches the landing's
          warm closing. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none -z-10 [mask-image:radial-gradient(70%_70%_at_50%_50%,black_40%,transparent_85%)]"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-primary/20 via-violet-500/15 to-fuchsia-500/10 blur-[100px]" />
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
          <p className="text-muted-foreground text-sm">Welcome back</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

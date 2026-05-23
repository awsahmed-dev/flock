import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/landing-hero";
import { Scrollytelling } from "@/components/landing/scrollytelling";
import { LandingClosing } from "@/components/landing/landing-closing";
import { Users, ArrowRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Marketing landing page. Three top-level sections:
 *
 *   1. <LandingHero/>      — headline, sub, dual CTAs, animated phone collage
 *   2. <Scrollytelling/>   — pinned phone + feature scroll narrative
 *   3. <LandingClosing/>   — final CTA + footer
 *
 * Anything that needs the brand bar / theme / animations is its own client
 * component; the page itself stays as a small server-rendered shell that
 * also handles the OAuth `?code=` redirect guard.
 */
export default async function HomePage({ searchParams }: PageProps) {
  // Resilience guard: catch orphaned OAuth `?code=` and forward to callback.
  const sp = await searchParams;
  const code = sp.code;
  if (typeof code === "string" && code.length > 0) {
    const next = typeof sp.next === "string" ? sp.next : "/dashboard";
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
    );
  }

  return (
    <div className="min-h-screen bg-[#070617] text-white overflow-hidden">
      {/* Top nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070617]/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Paxawa</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex text-sm font-medium text-white/70 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 hover:bg-white/90 px-4 py-2 text-sm font-bold transition-colors"
            >
              Start free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <LandingHero />
      <Scrollytelling />
      <LandingClosing />
    </div>
  );
}

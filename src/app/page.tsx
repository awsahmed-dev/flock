import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/landing-hero";
import { Scrollytelling } from "@/components/landing/scrollytelling";
import { LandingClosing } from "@/components/landing/landing-closing";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";

function NavAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors"
    >
      {children}
    </a>
  );
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Marketing landing page. v2 — flat, sharp, 2026-coded.
 *
 *   1. <LandingHero/>      — centered headline + CTAs + travel-image strip
 *   2. <Scrollytelling/>   — one section per feature, sticky title, flat screenshot card
 *   3. <LandingClosing/>   — minimal final CTA + footer
 *
 * Pure black background everywhere. No device frames, no notches, no
 * shadow gimmickry. Type does the heavy lifting.
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
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Top nav — slim, glass on scroll. Anchor links jump to landing
          sections; smooth scroll comes from html { scroll-behavior: smooth }
          set in globals.css (Tailwind v4 default). */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center shrink-0 text-white"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="sm" />
          </Link>

          {/* Centered anchor nav — desktop only. */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <NavAnchor href="#features">Features</NavAnchor>
            <NavAnchor href="#try-it">Try it</NavAnchor>
            <NavAnchor href="#destinations">Destinations</NavAnchor>
            <NavAnchor href="#pricing">Pricing</NavAnchor>
          </nav>

          <nav className="flex items-center gap-1 shrink-0">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex text-sm text-white/60 hover:text-white px-3 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-4 py-2 text-sm font-medium transition-colors"
            >
              Sign up
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

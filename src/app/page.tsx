import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/landing-hero";
import { Scrollytelling } from "@/components/landing/scrollytelling";
import { PhaseStrip } from "@/components/landing/phase-strip";
import { PainTicker } from "@/components/landing/pain-ticker";
import { LandingClosing } from "@/components/landing/landing-closing";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";

// Even though the landing is mostly cached marketing content, we need to
// run on every request to check the auth cookie — a signed-in user who
// re-opens paxawa.com expects their dashboard, not the marketing pitch.
export const dynamic = "force-dynamic";

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

  // If they're already signed in, send them straight to /dashboard.
  // Tester finding: closing + reopening the tab landed signed-in users
  // back on the marketing page, which felt like a sign-out. The cookie
  // was actually persisting fine — we just weren't honoring it here.
  // The `?from=landing` query opts out for the case of a signed-in user
  // explicitly clicking the logo to revisit marketing.
  let signedIn = false;
  if (sp.from !== "landing") {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = !!user;
    } catch {
      // Auth lookup hiccup — show the marketing page.
    }
  }
  // redirect() throws an internal NEXT_REDIRECT; must be outside try.
  if (signedIn) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-[#8B7CFF] selection:text-[#0D0D0D]">
      {/* Top nav — slim, glass on scroll. Anchor links jump to landing
          sections; smooth scroll comes from html { scroll-behavior: smooth }
          set in globals.css (Tailwind v4 default). */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0D0D0D]/75 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center shrink-0 text-white"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="sm" />
          </Link>

          {/* Centered anchor nav — desktop only. B26: added /blog so the
              long-form posts surface in the main nav (and so Google sees
              an internal link from the homepage to the blog hub). */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <NavAnchor href="#features">Features</NavAnchor>
            <NavAnchor href="#phases">How it works</NavAnchor>
            <Link
              href="/blog"
              className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors"
            >
              Blog
            </Link>
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-4 py-2 text-sm font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </nav>
        </div>
      </header>

      <LandingHero />
      <PhaseStrip />
      <PainTicker />
      <Scrollytelling />
      <LandingClosing />

      {/* B26: structured data for rich results in Google. Organization
          tells search engines who runs the site; WebSite enables the
          sitelinks search box; SoftwareApplication marks Paxawa up as
          a free app so it can surface in 'best group travel apps'
          style queries with stars / pricing / description prefilled. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://paxawa.com/#org",
                name: "Paxawa",
                url: "https://paxawa.com",
                logo: "https://paxawa.com/icons/icon-512x512.png",
                sameAs: [],
              },
              {
                "@type": "WebSite",
                "@id": "https://paxawa.com/#site",
                url: "https://paxawa.com",
                name: "Paxawa",
                description:
                  "Group travel planning that doesn't end in three split conversations and a spreadsheet.",
                publisher: { "@id": "https://paxawa.com/#org" },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                      "https://paxawa.com/blog?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "SoftwareApplication",
                name: "Paxawa",
                applicationCategory: "TravelApplication",
                operatingSystem: "Web, iOS, Android",
                description:
                  "One home for the whole group trip: phase-aware planning, shared itinerary, group decisions, multi-currency expense splitting with receipt scanning, offline day sheets, and a shareable trip recap. Fully available in English and Arabic.",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                },
                featureList: [
                  "Phase-aware home screen (plan, depart, live, recap)",
                  "Shared itinerary on a live map",
                  "Huddle: group polls, documents, packing",
                  "Multi-currency expense splitting + receipt scan",
                  "Offline Pocket Day",
                  "The Wrap: shareable trip recap",
                  "Full Arabic (RTL) support",
                  "One-link invite for the crew",
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

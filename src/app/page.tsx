import { redirect } from "next/navigation";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { VisionXClient } from "@/components/landing/vision/vision-x-client";
import { createClient } from "@/lib/supabase/server";

// Marketing content, but we still run per-request to honor the auth
// cookie — a signed-in user who re-opens paxawa.com expects their
// dashboard, not the pitch.
export const dynamic = "force-dynamic";

// The app's Arabic face — the root layout only attaches --font-arabic
// when the app locale is ar, and the landing is Arabic-first regardless,
// so it loads its own scoped copy.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic-x",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The landing: "Flight Mode" (concept D, promoted). A 3D paper plane
 * flies a day-cycle sky, scroll is the throttle, and the four trip
 * phases are gates with the real app demos docked at each. Arabic-first
 * with an EN toggle. Lives in src/components/landing/vision/vision-x.tsx.
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

  // Signed-in users go straight to /dashboard; `?from=landing` opts out
  // so a signed-in user can still deliberately revisit marketing.
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
    <div className={plexArabic.variable}>
      <VisionXClient />

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

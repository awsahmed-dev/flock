import type { MetadataRoute } from "next";

/**
 * Search-engine guidance. Public routes (landing, auth, legal, public share
 * pages) are open. Everything authenticated is disallowed — both to keep
 * private content out of search results and because returning auth-walled
 * pages to a crawler is wasted budget on their side.
 */

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://paxawa.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/", "/terms", "/privacy", "/share/", "/invite/"],
        disallow: [
          "/dashboard",
          "/trips/",
          "/api/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}

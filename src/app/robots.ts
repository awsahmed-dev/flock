import type { MetadataRoute } from "next";

/**
 * Search-engine guidance. Public routes (landing, auth, legal, public share
 * pages) are open. Everything authenticated is disallowed — both to keep
 * private content out of search results and because returning auth-walled
 * pages to a crawler is wasted budget on their side.
 */

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://sawia.paxawa.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/", "/auth/", "/terms", "/privacy", "/share/"],
        disallow: [
          "/dashboard",
          "/trips/",
          "/api/",
          "/_next/",
          // Invite links are tokenised trip-join credentials — an indexed
          // invite is a stranger walking into someone's trip (audit §9).
          // /share/ stays crawlable deliberately: sharing is the point.
          "/invite/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}

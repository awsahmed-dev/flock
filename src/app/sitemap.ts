import type { MetadataRoute } from "next";

/**
 * Public sitemap. Only routes we *want* crawled appear here. Authenticated
 * pages (/dashboard, /trips/*, /api/*) are kept out — they're behind auth
 * anyway and listing them tempts crawlers to attempt access.
 *
 * Share pages (/share/[token]) are deliberately public but we don't put
 * specific tokens in the sitemap. They're discovered through user sharing,
 * not search engines.
 */

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://paxawa.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/auth/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/auth/signup`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];
}

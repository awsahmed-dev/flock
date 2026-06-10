import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";

/**
 * Public sitemap. Only routes we *want* crawled appear here. Authenticated
 * pages (/dashboard, /trips/*, /api/*) are kept out — they're behind auth
 * anyway and listing them tempts crawlers to attempt access.
 *
 * Share pages (/share/[token]) are deliberately public but we don't put
 * specific tokens in the sitemap. They're discovered through user sharing,
 * not search engines.
 *
 * B26: blog index + each blog post auto-included from the BLOG_POSTS
 * registry. lastModified uses the post's updatedAt when set, else
 * publishedAt — so a content edit signals freshness to crawlers
 * without us forgetting to bump a date.
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
      url: `${SITE}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...BLOG_POSTS.map((p) => ({
      url: `${SITE}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt ?? p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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

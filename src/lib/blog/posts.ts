/**
 * B26: blog post registry. Single source of truth for sitemap,
 * blog index, related-posts strips, and the per-post page metadata.
 * Each post is a static MDX-style page under src/app/blog/[slug]/
 * but we list the metadata here so we don't have to crawl the file
 * tree at build time.
 *
 * Adding a post: create src/app/blog/<slug>/page.tsx + append an
 * entry here. Sitemap + index pick it up automatically.
 */
export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  /** ISO date — used for sitemap lastmod + sort order + JSON-LD. */
  publishedAt: string;
  /** ISO date — only set when materially updated. */
  updatedAt?: string;
  author: string;
  /** Estimated read time in minutes. */
  readMinutes: number;
  /** Topic tag — shown as a chip on the index page. */
  tag: string;
  /** Unsplash photo URL — hero + OG image source. Must be unsplash.com so
   *  the `?w=1600&auto=format` query keeps it lightweight + sharp. */
  heroImage: string;
  /** Short alt for the hero image. Required for a11y + crawlers. */
  heroAlt: string;
  /** Photographer name for the Unsplash attribution line. */
  heroCredit: string;
  /** Photographer Unsplash profile URL for the attribution line. */
  heroCreditLink: string;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "how-to-plan-a-group-trip",
    title:
      "How to plan a group trip without losing your mind — a step-by-step guide",
    description:
      "Group trips fall apart for predictable reasons. Here's a 5-step playbook for picking the destination, splitting decisions, agreeing on money, and packing without the WhatsApp chaos.",
    publishedAt: "2026-05-20",
    author: "The Paxawa Team",
    readMinutes: 9,
    tag: "Group travel",
    heroImage:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&auto=format&fit=crop&q=80",
    heroAlt:
      "Four friends walking through a sunlit narrow alleyway on a group trip",
    heroCredit: "Helena Lopes",
    heroCreditLink: "https://unsplash.com/@wildlittlethingsphoto",
  },
  {
    slug: "split-expenses-with-friends-on-vacation",
    title:
      "How to split expenses with friends on vacation — 5 methods that actually work",
    description:
      "From the napkin tally to multi-currency apps: a candid comparison of how groups split travel costs in 2026, when each method works, and the FX gotchas nobody warns you about.",
    publishedAt: "2026-05-27",
    author: "The Paxawa Team",
    readMinutes: 11,
    tag: "Money",
    heroImage:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&auto=format&fit=crop&q=80",
    heroAlt:
      "Hands counting cash and using a phone calculator at a restaurant table",
    heroCredit: "Jp Valery",
    heroCreditLink: "https://unsplash.com/@jpvalery",
  },
  {
    slug: "ai-itinerary-planning-guide",
    title:
      "AI itinerary planning: how it works, where it shines, and when to skip it",
    description:
      "AI trip planners can turn a blank page into a 7-day itinerary in seconds — but they also hallucinate restaurants and miss your taste. A practical guide for travelers who want the speed without the surprises.",
    publishedAt: "2026-06-03",
    author: "The Paxawa Team",
    readMinutes: 10,
    tag: "AI",
    heroImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&auto=format&fit=crop&q=80",
    heroAlt: "Open notebook, map, and camera on a wooden table during trip planning",
    heroCredit: "Sylwia Bartyzel",
    heroCreditLink: "https://unsplash.com/@sylwiabartyzel",
  },
];

export function getPostBySlug(slug: string): BlogPostMeta | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function getOtherPosts(slug: string, limit = 2): BlogPostMeta[] {
  return BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, limit);
}

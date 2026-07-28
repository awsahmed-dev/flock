/**
 * B26: blog post registry. Single source of truth for sitemap,
 * blog index, related-posts strips, and the per-post page metadata.
 * Each post is a static MDX-style page under src/app/blog/[slug]/
 * but we list the metadata here so we don't have to crawl the file
 * tree at build time.
 *
 * Adding a post: create src/app/blog/<slug>/page.tsx + append an
 * entry here. Sitemap + index pick it up automatically.
 *
 * Blog v2: tags map to the app's semantic hues (see TAGS) and covers
 * are generated in-system (components/blog/post-cover.tsx) instead of
 * stock photos. `heroImage` remains for OG/social cards only.
 */

/** Tag → the app's semantic hue it renders in. */
export const TAGS = {
  "Group travel": { hue: "#8B7CFF" },
  Money: { hue: "#9BC97E" },
  AI: { hue: "#3EC5B7" },
  Product: { hue: "#FF8A5C" },
  Offline: { hue: "#E0B252" },
  Arabic: { hue: "#3EC5B7" },
} as const;

export type BlogTag = keyof typeof TAGS;

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
  /** Topic tag — hue-coded chip + generated cover. */
  tag: BlogTag;
  /** OG/social image only — the visual cover is generated from the tag. */
  heroImage: string;
  /** Short alt for the OG image. */
  heroAlt: string;
}

const OG_FALLBACK = "https://paxawa.com/icons/icon-512x512.png";

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
    heroAlt:
      "Open notebook, map, and camera on a wooden table during trip planning",
  },
  {
    slug: "four-phases-of-a-group-trip",
    title:
      "The four phases of a group trip — and why your travel app should change shape",
    description:
      "Planning, departure week, the trip itself, and the after. Each phase needs a different screen — so why does every travel app show you the same one? Inside the thinking behind Paxawa's phase engine.",
    publishedAt: "2026-07-22",
    author: "The Paxawa Team",
    readMinutes: 8,
    tag: "Product",
    heroImage: OG_FALLBACK,
    heroAlt: "Paxawa logo",
  },
  {
    slug: "offline-travel-itinerary",
    title:
      "Your itinerary is useless without signal — how to travel with an offline day plan",
    description:
      "No eSIM, dead zones, metro tunnels, roaming bills: the case for planning tools that work with zero bars, and a checklist for making any trip survive airplane mode.",
    publishedAt: "2026-07-25",
    author: "The Paxawa Team",
    readMinutes: 7,
    tag: "Offline",
    heroImage: OG_FALLBACK,
    heroAlt: "Paxawa logo",
  },
  {
    slug: "planning-group-trips-in-arabic",
    title:
      "Planning a group trip in Arabic: what a truly RTL-first travel app looks like",
    description:
      "Most travel apps bolt Arabic on as an afterthought — flipped icons, broken numbers, English creeping in. Here's what actually breaks, and how we built Paxawa to plan trips natively in Arabic.",
    publishedAt: "2026-07-28",
    author: "The Paxawa Team",
    readMinutes: 8,
    tag: "Arabic",
    heroImage: OG_FALLBACK,
    heroAlt: "Paxawa logo",
  },
];

export function getPostBySlug(slug: string): BlogPostMeta | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function getOtherPosts(slug: string, limit = 2): BlogPostMeta[] {
  return BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, limit);
}

import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/blog-shell";
import { getPostBySlug, getOtherPosts } from "@/lib/blog/posts";

const SLUG = "offline-travel-itinerary";
const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    url: `/blog/${SLUG}`,
    title: post.title,
    description: post.description,
    publishedTime: post.publishedAt,
    authors: [post.author],
    images: [{ url: post.heroImage, alt: post.heroAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description: post.description,
    images: [post.heroImage],
  },
};

const SITE = "https://paxawa.com";

export default function Page() {
  const related = getOtherPosts(SLUG);
  return (
    <>
      <BlogShell post={post} related={related}>
        <p>
          Every itinerary works perfectly in the hotel lobby Wi-Fi. The real
          test happens forty minutes later: you're three stops deep into the
          Tokyo metro, the address of the restaurant is "in the chat," the
          chat needs signal, and the signal died two stations ago.
        </p>
        <p>
          Connectivity on trips is worse than we plan for, in predictable
          ways. Here's where it breaks, and how to build a day plan that
          survives airplane mode.
        </p>

        <h2>Where signal actually dies</h2>
        <ul>
          <li>
            <strong>The arrival gap.</strong> The airport-to-SIM window —
            you've landed, you have no data, and this is precisely when you
            need the hotel address and the transfer plan.
          </li>
          <li>
            <strong>Underground transit.</strong> Metros in Tokyo, Paris,
            and half the world's great cities are where you do most of your
            between-stop navigating — with no bars.
          </li>
          <li>
            <strong>The one friend without an eSIM.</strong> Every group has
            one person roaming-averse enough to spend the whole trip on
            borrowed hotspots. Their copy of the plan matters too.
          </li>
          <li>
            <strong>Rural everything.</strong> Coastal roads, mountains,
            deserts, islands. The more memorable the destination, the worse
            the coverage.
          </li>
        </ul>

        <h2>The screenshot method (and why it fails)</h2>
        <p>
          The folk solution is screenshots: the booking, the map, the
          address, all saved to camera roll the night before. It works —
          until the plan changes at breakfast, and now half the group is
          navigating from yesterday's screenshot. Static copies of a live
          plan go stale the moment the group improvises, which is to say:
          every single day.
        </p>

        <div className="callout">
          <strong>Rule of thumb</strong>
          If your offline copy can't survive a lunch-table plan change, it's
          not an offline plan — it's a photo of one.
        </div>

        <h2>What an actually-offline day plan needs</h2>
        <ul>
          <li>
            <strong>Today's stops, in order,</strong> with addresses and
            times — cached automatically, not by you remembering to save.
          </li>
          <li>
            <strong>The documents that matter today:</strong> the ticket
            with the QR code, the booking confirmation, the visa PDF.
          </li>
          <li>
            <strong>Self-updating when signal returns.</strong> The cache
            should refresh itself in the background every time you pass
            through Wi-Fi, so the offline copy is never older than your
            last coffee stop.
          </li>
          <li>
            <strong>No app-store dependency.</strong> A web app that works
            offline means the friend who never downloaded anything can still
            open today's plan from the invite link they already have.
          </li>
        </ul>

        <h2>How Paxawa does it</h2>
        <p>
          This is exactly what Pocket Day is. When your trip goes live,
          Paxawa quietly caches today's plan — stops, times, addresses,
          pinned documents — on your phone. Zero bars in the metro? Open the
          app, today is there. Signal comes back on the escalator? It
          re-syncs before you reach the street.
        </p>
        <p>
          Nobody screenshots anything. Nobody is navigating from yesterday's
          plan. And the friend without the eSIM finally stops asking "wait,
          where are we going?"
        </p>
      </BlogShell>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${SLUG}` },
            headline: post.title,
            description: post.description,
            image: [post.heroImage],
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
            author: { "@type": "Organization", name: post.author },
            publisher: {
              "@type": "Organization",
              name: "Paxawa",
              logo: { "@type": "ImageObject", url: `${SITE}/icons/icon-512x512.png` },
            },
          }),
        }}
      />
    </>
  );
}

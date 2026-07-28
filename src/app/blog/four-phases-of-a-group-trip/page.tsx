import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog/blog-shell";
import { getPostBySlug, getOtherPosts } from "@/lib/blog/posts";

const SLUG = "four-phases-of-a-group-trip";
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
          Ask anyone how their last group trip went and they'll tell you a
          story in chapters. The months of "are we doing this?" The frantic
          week before departure. The trip itself. And the strange quiet
          afterwards, when the group chat that pinged forty times a day goes
          silent forever.
        </p>
        <p>
          Four chapters, four completely different jobs. Which raises an
          obvious question nobody in travel software seems to ask:{" "}
          <strong>
            why does your travel app show you the same screen in all four?
          </strong>
        </p>

        <h2>Phase 1: Planning — the trip is a to-do list</h2>
        <p>
          Months out, a trip isn't a trip. It's a pile of open questions:
          dates, crew, budget, where to sleep, what to do. The job of the app
          in this phase is to <em>close questions</em> — show what's decided,
          what isn't, and who's blocking what.
        </p>
        <p>
          That's why Paxawa's home screen in this phase is a cockpit: a
          readiness bar that fills as the basics get locked, day chips that
          show which days have a plan, and the open decisions stacked where
          nobody can pretend they didn't see them.
        </p>

        <h2>Phase 2: Departure week — the trip is a checklist</h2>
        <p>
          Seven days out, nobody cares about the vibe board anymore. The
          questions become brutally practical: is the visa printed? What's
          the weather doing? Who still hasn't packed? Where is the flight
          confirmation?
        </p>
        <p>
          The same home screen now needs to be a T-minus board — documents
          one tap away, weather pulled in, packing gaps called out by name.
          If the app still opens on an inspiration feed in departure week,
          it has failed you exactly when the stakes went up.
        </p>

        <div className="callout">
          <strong>The test</strong>
          Open your current travel tool three days before a flight. Count the
          taps to reach your hotel confirmation. If it's more than two, that
          tool was built for browsing, not traveling.
        </div>

        <h2>Phase 3: The trip — the app should almost disappear</h2>
        <p>
          On the ground, attention is the scarcest resource. The right
          interface for day 3 in Tokyo is not a planning suite — it's
          today's three stops, the address of the next one, and a fast way
          to log the dinner bill before everyone forgets who paid.
        </p>
        <p>
          Paxawa's NOW screen collapses to exactly that. And because dead
          zones, metro tunnels, and no-eSIM travelers are real, the day
          sheet — Pocket Day — is cached offline. Zero bars, full plan.
        </p>

        <h2>Phase 4: After — the trip deserves an ending</h2>
        <p>
          Here's the saddest pattern in group travel: the trip ends, someone
          says "send me the photos!!", three people half-do it, one dinner
          never gets settled, and the chat dies without a eulogy.
        </p>
        <p>
          The fix is giving the trip a finale. When a Paxawa trip ends, it
          becomes the Wrap — photos, stats, crew awards, and the final
          settle-up in one shareable recap. It's a small ritual with an
          outsized effect: groups that end trips well plan the next one
          sooner.
        </p>

        <h2>Why "one app, four shapes" matters</h2>
        <p>
          You could assemble all of this from parts — a spreadsheet for
          planning, a notes app for the checklist, screenshots for offline,
          a shared album for the after. Most groups do. That's exactly the
          problem: every phase transition drops information on the floor,
          and the person holding the spreadsheet becomes the single point of
          failure.
        </p>
        <p>
          A trip is one continuous thing. The tool should be too — it should
          just know which chapter you're in.{" "}
          <Link href="/#phases">See how the phase engine works</Link>, or
          start a trip and watch the home screen change shape as the dates
          get closer.
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

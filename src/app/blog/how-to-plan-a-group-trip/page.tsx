import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/blog-shell";
import { getPostBySlug, getOtherPosts } from "@/lib/blog/posts";

const SLUG = "how-to-plan-a-group-trip";
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
          Group trips have a near-perfect track record of starting with
          enthusiasm and ending with at least one person not speaking to
          another. It's not the destination's fault. It's almost always the
          same five problems: nobody agreed on the dates, the chat split into
          three side conversations, decisions got debated instead of decided,
          money got vague, and someone forgot the visa requirements.
        </p>
        <p>
          The good news: every one of those is fixable with a small amount of
          structure up front. Below is the playbook we wish every group had
          before opening their group chat.
        </p>

        <h2>1. Lock the basics before the deep planning</h2>
        <p>
          The single biggest reason group trips fall apart isn't a bad
          itinerary — it's that people keep designing the trip while the
          basics are still in flux. Two people are pricing flights for August;
          another is browsing November stays. Lock these <strong>first</strong>:
        </p>
        <ul>
          <li>
            <strong>Window of dates.</strong> Not a single specific date — a
            rough window everyone confirms they can travel in. Two weeks in
            mid-October beats "sometime this fall."
          </li>
          <li>
            <strong>Destination shortlist.</strong> Three options max. More
            than that and you've created a survey, not a decision.
          </li>
          <li>
            <strong>Budget band.</strong> A per-person range that covers
            flights + stay + spend. Don't ask for a "comfortable number" — ask
            for a ceiling.
          </li>
          <li>
            <strong>Vibe.</strong> One sentence that everyone signs off on.
            "Beach-ish, mostly chill, one cultural day." Different from a
            packed multi-city sprint.
          </li>
        </ul>
        <p>
          Until those four are pinned, every other conversation is theoretical.
          Once they're pinned, half of the future debates simply don't happen.
        </p>

        <div className="callout">
          <strong>Pro tip</strong>
          Send a single message with these four lines and ask for a yes/no.
          No emoji reactions. No "let's see." Real commitment, in writing.
        </div>

        <h2>2. Vote on options instead of debating them</h2>
        <p>
          The reason group debates feel endless is that they're not debates —
          they're polls without the structure. Six people each casually
          suggest a hotel in the chat, three of them get half-defended, two
          get ignored entirely, and nobody actually counts the preferences.
        </p>
        <p>
          The shortcut: every meaningful decision (hotel, day plan,
          restaurant, activity) becomes a binary or 3-option vote with a
          deadline. Two days max. Whoever doesn't vote forfeits the right to
          complain later — and you actually move forward.
        </p>
        <p>
          The decisions worth voting on, in our experience:
        </p>
        <ul>
          <li>Hotel / Airbnb (cost varies by 2-3× across reasonable options)</li>
          <li>The "splurge" meal (one big dinner the group remembers)</li>
          <li>Any full-day activity that requires booking ahead</li>
          <li>Departure airport when people fly from different cities</li>
        </ul>
        <p>
          What's <em>not</em> worth a vote: every restaurant, every coffee
          shop, every cab. Death by polls is real. If it costs less than a
          single shared dinner, just pick.
        </p>

        <h2>3. One itinerary, not three Google Docs</h2>
        <p>
          The "I made a Google Doc" energy is well-intentioned and almost
          always becomes the problem. By day three of the trip there are two
          docs, one Notion page, three pinned WhatsApp messages, and a Notes
          app screenshot. Nobody knows which is current.
        </p>
        <p>
          What works: a single shared itinerary that everyone can see and
          edit, organized by day. Each day is a short list — usually one
          anchor activity, one meal slot, and a flex slot for whatever
          comes up. Anything more granular is over-planning a vacation.
        </p>
        <p>
          The format matters less than the rule:{" "}
          <strong>only one place to look.</strong> Doesn't matter if it's a
          shared note, a trip app, or a sheet — pick one, link it everywhere,
          and kill the duplicates.
        </p>

        <div className="callout">
          <strong>The 80/20 itinerary</strong>
          Plan 80% of the days in detail. Leave 20% blank for the things
          you'll discover walking around. A trip with zero flex slots feels
          like a school field trip.
        </div>

        <h2>4. Split expenses as you go, not at the end</h2>
        <p>
          The single biggest source of post-trip awkwardness is the
          end-of-trip math. Someone paid for the cab from the airport,
          someone else covered three dinners, and by Tuesday of the second
          week nobody remembers what was whose. The final spreadsheet
          arrives in a group chat, and the WhatsApp goes quiet.
        </p>
        <p>
          What we recommend instead:
        </p>
        <ul>
          <li>
            <strong>Log spend the same day it happens.</strong> Five seconds
            in an app while you're waiting for coffee beats an hour of
            archaeology at the airport on the way home.
          </li>
          <li>
            <strong>Pick a single base currency.</strong> Especially
            important on international trips where some people paid in EUR
            and others in local. Tools that handle multi-currency natively
            save the post-trip "what's the exchange rate" argument.
          </li>
          <li>
            <strong>Decide upfront which expenses are shared.</strong> The
            apartment? Obvious. The cab to the airport? Yes. Your room
            service at 2am? Personal. Be explicit so nobody has to ask.
          </li>
          <li>
            <strong>Settle once at the end, not five times a day.</strong>{" "}
            Constant per-meal Venmo is exhausting and adds fees. Track all
            of it, settle once.
          </li>
        </ul>

        <h2>5. Pack as a crew, not as individuals</h2>
        <p>
          Two power adapters between seven people. Six bottles of sunscreen.
          Nobody brought the speaker. Group packing has a separate failure
          mode from solo: the assumption that <em>someone</em> brought it.
        </p>
        <p>
          The fix is comically simple: a shared list with two sections.
          <strong> Group items</strong> (one of each — adapter, first-aid
          kit, speaker, board game, sunscreen) get claimed by name.
          <strong> Personal items</strong> stay personal but on the same
          checklist so people can see what they're forgetting.
        </p>
        <p>
          On the morning of departure, the only thing the group chat needs
          to ask is "everyone packed?" — not "wait, who has the…"
        </p>

        <h2>6. The day-of stuff that actually matters</h2>
        <p>
          A few small operational things to agree on before the trip starts:
        </p>
        <ul>
          <li>
            <strong>One person carries the booking confirmations</strong> in
            an offline-accessible folder. Email backup; phone primary.
          </li>
          <li>
            <strong>One person is the navigator for the day.</strong>{" "}
            Rotate. Nobody enjoys herding seven adults through Shibuya
            station for an entire week.
          </li>
          <li>
            <strong>Share an eSIM or roaming plan in advance.</strong>{" "}
            Getting connectivity at the airport with a tired group is
            harder than it sounds.
          </li>
          <li>
            <strong>Set a "we meet back here at" time</strong> for any free
            block. Don't try to keep seven people moving as one unit all
            day — you'll all hate each other by lunch.
          </li>
        </ul>

        <h2>The two things groups always underestimate</h2>
        <p>
          First, <strong>downtime.</strong> The pace that feels manageable
          for one person is exhausting for a group. Stack 9am to 11pm with
          activities and by day four people are snapping over breakfast.
          Build in genuinely unscheduled blocks.
        </p>
        <p>
          Second, <strong>private time.</strong> Even close friends need an
          hour alone every day on a trip. Make it culturally OK to disappear
          without explanation. The reunion at dinner is always better when
          people had a quiet afternoon.
        </p>

        <h2>Putting it together</h2>
        <p>
          None of this is rocket science — it's just decisions made upfront
          instead of arguments deferred to the trip itself. If you do the
          first five things on this list <em>before</em> the chat opens,
          you've solved about 90% of the things that wreck group trips.
        </p>
        <p>
          The other 10% — the food poisoning, the missed flight, the
          impossible-to-find Airbnb keys — those are the stories you'll
          tell for years.
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

import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/blog-shell";
import { getPostBySlug, getOtherPosts } from "@/lib/blog/posts";

const SLUG = "split-expenses-with-friends-on-vacation";
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
          Splitting money with friends on vacation is one of those problems
          that sounds simple right up until the moment it isn't. You're
          tired, you're in a country where the currency has too many zeros,
          someone paid for the cab and you can't remember if it was Sara or
          Adam, and now you're trying to do mental math on a napkin while
          the waiter waits.
        </p>
        <p>
          There are five reasonable ways to handle it. Each has a sweet
          spot. Below is what they are, when they work, and the failure mode
          for each so you can pick the right one for your group.
        </p>

        <h2>Method 1: Even split — the simplest, often the wrong one</h2>
        <p>
          You add up the total at the end and divide by the number of
          people. Clean, mathematically. Frequently unfair, practically.
        </p>
        <p>
          <strong>When it works.</strong> When everyone's spending pattern is
          roughly identical: same room, same activities, same level of "yes
          to dessert." For a 4-day beach trip where the group does the same
          things every day, even split is honest and zero-friction.
        </p>
        <p>
          <strong>When it doesn't.</strong> The moment someone skips a
          dinner, takes a solo day, or drinks twice what others do, even
          split silently overcharges the lighter spenders. They notice. They
          don't always say anything. It just becomes the reason they don't
          want to do the next group trip.
        </p>

        <h2>Method 2: Itemized — fair, slow, requires discipline</h2>
        <p>
          Every expense gets logged with who paid and who was in on it. At
          the end, you net out the balances and people settle.
        </p>
        <p>
          This is the method most apps are built around. It's accurate, it
          handles uneven spending naturally, and it survives one person
          skipping the museum.
        </p>
        <p>
          <strong>When it works.</strong> Groups of 3+ where people's
          spending patterns differ, or trips longer than a long weekend.
          Anything where "let's just split it" would silently overcharge
          someone.
        </p>
        <p>
          <strong>When it doesn't.</strong> When the group hates the
          overhead. If logging an espresso feels like filing a TPS report,
          the system collapses by day three and you end up arguing in the
          airport.
        </p>
        <p>
          The trick to making itemized work: it has to take less than five
          seconds per expense. If your tool takes thirty seconds, you'll
          stop using it.
        </p>

        <div className="callout">
          <strong>What "in on it" actually means</strong>
          Some apps default every expense to "everyone." That's wrong on a
          mixed trip. Better default: only include the people who were
          actually present for that meal / cab / ticket. Costs five extra
          taps; saves a dozen arguments.
        </div>

        <h2>Method 3: The kitty — old school, surprisingly good</h2>
        <p>
          Everyone throws an equal amount into a common pool at the start
          (cash or one person's card). All shared expenses come out of it.
          When it runs low, top it up. At the end you split the remainder.
        </p>
        <p>
          <strong>When it works.</strong> Short trips with a tight group
          where the spend is predictable. Bachelor / bachelorette trips are
          the canonical example — high-volume shared expenses, similar pace,
          no time for spreadsheets.
        </p>
        <p>
          <strong>When it doesn't.</strong> Long trips where the pool needs
          constant top-ups. Trips across borders where the cash is in the
          wrong currency by day three. Groups where people skip things —
          you've already paid in, so skipping feels like you're losing money.
        </p>

        <h2>Method 4: Running tally — one person tracks everything</h2>
        <p>
          One designated person — usually the planner, often the person who
          loves spreadsheets — logs every shared expense in real time. At
          the end, they tell everyone what they owe.
        </p>
        <p>
          <strong>When it works.</strong> When the tracker actually loves
          this. Some people genuinely enjoy being the trip CFO and the rest
          of the group is happy to not think about it.
        </p>
        <p>
          <strong>When it doesn't.</strong> When the tracker is doing it out
          of guilt. They get burned out by day four, the log becomes spotty,
          and the final invoice has obvious mistakes that nobody wants to be
          the one to question.
        </p>
        <p>
          The cleanest version of this method uses a shared tool everyone
          can view. The tracker enters; the group sees. Disputes get
          surfaced and resolved on the spot instead of at the end.
        </p>

        <h2>Method 5: A dedicated app — the modern default</h2>
        <p>
          For groups bigger than three or trips longer than a weekend, a
          purpose-built expense app is genuinely the best answer. Not
          because the math is too hard, but because the social overhead is.
          The app becomes the impartial third party.
        </p>
        <p>
          The features that actually matter:
        </p>
        <ul>
          <li>
            <strong>Fast entry.</strong> Less than five seconds per expense.
            Everything else is a feature pile.
          </li>
          <li>
            <strong>Multi-currency.</strong> If anyone on the trip is paying
            in a different currency than the trip's base, the app has to
            handle FX automatically. Manual conversion is where every
            international group trip eventually breaks.
          </li>
          <li>
            <strong>Per-expense participants.</strong> Not every expense
            includes everyone. The tool needs to support "this dinner was
            just the four of us."
          </li>
          <li>
            <strong>Net settlement.</strong> At the end, you want one
            transfer per person, not a graph of micropayments. "Aws pays
            Sara €40, done."
          </li>
        </ul>

        <h2>The multi-currency gotcha nobody warns you about</h2>
        <p>
          If your trip crosses currencies, this is the one to get right.
          The mistake almost everyone makes is using <em>today's</em>{" "}
          exchange rate for an expense that happened three weeks ago. EUR
          to USD doesn't move much in a few weeks — but for currencies
          that drift (any emerging market, anything tied to commodities),
          a 2% move on a $3,000 trip is real money.
        </p>
        <p>
          The correct behavior, which good tools do automatically:
        </p>
        <ul>
          <li>Log every expense in the currency it was paid in.</li>
          <li>
            Convert to the trip's base currency using the rate{" "}
            <strong>on the day of the expense</strong>, not today.
          </li>
          <li>Show the base-currency total prominently — it's what people will settle in.</li>
          <li>Show the original currency as a small subtitle so receipts still match.</li>
        </ul>

        <div className="callout">
          <strong>One more thing</strong>
          If you're paying with credit cards, the bank's FX rate is usually
          worse than the mid-market rate by 1-3%. Pick a tool that uses
          mid-market for the math; the math should reflect what was{" "}
          <em>spent</em>, not what was billed.
        </div>

        <h2>The settle-up problem</h2>
        <p>
          Even after you've tracked everything perfectly, there's one last
          step that's surprisingly easy to mess up: the actual money
          movement.
        </p>
        <p>
          Three things help:
        </p>
        <ul>
          <li>
            <strong>One transfer per person, max.</strong> The algorithm to
            minimize payments is well-known; any decent tool implements it.
            Nobody should send three separate transfers to three people.
          </li>
          <li>
            <strong>Agree on the platform upfront.</strong> Venmo in the
            US, Wise for international, Tabby/STC Pay in the Gulf, PayNow
            in Singapore. Settling across mismatched apps adds fees and
            time.
          </li>
          <li>
            <strong>Settle within a week of getting home.</strong> The
            longer the delay, the harder it is to follow up without
            feeling weird about it.
          </li>
        </ul>

        <h2>The honest recommendation</h2>
        <p>
          For most groups, an itemized app with multi-currency, per-expense
          participants, and net settlement is the right tool. The kitty and
          even-split methods are fine for short, simple trips. Running
          tallies work if you have a willing tracker. The wrong move is
          waiting to do the math at the end — that's where every group trip
          ends with someone owed money they're too polite to ask for.
        </p>
        <p>
          Pick a tool, set the base currency before you fly, and log spend
          the day it happens. The five seconds of friction per expense is
          the cheapest insurance you'll buy on the whole trip.
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

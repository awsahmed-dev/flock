import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/blog-shell";
import { getPostBySlug, getOtherPosts } from "@/lib/blog/posts";

const SLUG = "planning-group-trips-in-arabic";
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
          More than four hundred million people speak Arabic, and they take
          group trips exactly like everyone else — the same date debates,
          the same "who paid for the taxi", the same dying group chat. Yet
          try planning a trip in Arabic with mainstream travel software and
          you hit the same wall everywhere: the language is technically
          there, and practically unusable.
        </p>

        <h2>What "Arabic support" usually means</h2>
        <p>
          Most apps treat Arabic as a translation file: run the strings
          through localization, flip the layout with one CSS property, ship
          it. The result is a very specific kind of broken:
        </p>
        <ul>
          <li>
            <strong>Half-flipped screens.</strong> The text is right-to-left
            but the back arrow still points the wrong way, progress bars
            fill from the wrong side, and swipe gestures fight your thumb.
          </li>
          <li>
            <strong>Scrambled mixed text.</strong> The moment a sentence
            contains a friend's name or "USD 144.58", the bidirectional
            algorithm mangles the order — "you owe Priya $50" turns into
            word salad.
          </li>
          <li>
            <strong>English islands.</strong> The home screen is Arabic; the
            expense sheet, the errors, and every date are not. You end up
            reading two languages in one screen, forever.
          </li>
          <li>
            <strong>Latin-only typography.</strong> Arabic rendered in a
            font designed for English — cramped, unbalanced, and visibly an
            afterthought.
          </li>
        </ul>

        <h2>What RTL-first actually takes</h2>
        <p>
          Building Paxawa's Arabic mode taught us that real support is a
          hundred small decisions, not one big one:
        </p>
        <ul>
          <li>
            <strong>Logical direction everywhere.</strong> Not just text —
            every arrow, chevron, swipe-to-delete gesture, and progress
            fill flips with the language. If a bar fills left-to-right in
            English, it fills right-to-left in Arabic.
          </li>
          <li>
            <strong>Bidirectional isolation.</strong> Names, amounts, and
            currency codes are wrapped in isolation marks so "أنت مدين
            لـ Priya بـ USD 50" reads in exactly the right order, every
            time, in every sentence shape.
          </li>
          <li>
            <strong>Real Arabic plurals.</strong> Arabic has six plural
            forms. "One transaction, two transactions, three transactions"
            are three different words — معاملة، معاملتان، معاملات — and a
            travel app that gets the dual wrong reads like a robot.
          </li>
          <li>
            <strong>An Arabic-designed typeface.</strong> Paxawa renders
            Arabic in IBM Plex Sans Arabic — a geometric cut that matches
            the Latin design instead of clashing with it.
          </li>
          <li>
            <strong>Numbers that make sense for money.</strong> Western
            digits with Arabic grouping — the convention Arabic speakers
            actually use for prices — while accepting ٠-٩ input if you type
            it.
          </li>
        </ul>

        <div className="callout">
          <strong>The quick test</strong>
          Switch any app to Arabic and open its money screen. If the
          balances read naturally and the progress bars fill from the
          right, someone cared. If not, the rest of the app won't be
          different.
        </div>

        <h2>Why this matters for group trips specifically</h2>
        <p>
          A group trip tool only works if the <em>whole crew</em> uses it —
          that's the entire point. If the app is comfortable in English
          only, the crew's planning quietly migrates back to the group chat
          where everyone is comfortable, and you're back to forty unread
          messages and a spreadsheet.
        </p>
        <p>
          In Paxawa, one tap in the account panel switches the entire app —
          every screen, every sheet, every toast — between English and
          Arabic. Mixed crews just work: you plan in English, your cousin
          plans in Arabic, and it's the same trip.
        </p>
        <p>
          Group travel didn't need another English-first app with a
          translation file. It needed one that treats Arabic as a first
          language. That's the one we built.
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

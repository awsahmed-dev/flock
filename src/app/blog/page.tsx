import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { BLOG_POSTS, TAGS } from "@/lib/blog/posts";
import { PostCover } from "@/components/blog/post-cover";
import { SkyShell, GateChip, Barcode } from "@/components/landing/sky-shell";

export const metadata: Metadata = {
  title: "Blog · Group travel planning, expenses, AI itineraries",
  description:
    "Long-form guides on planning group trips, splitting expenses, offline travel, and Arabic-first trip planning — written by the Paxawa team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Paxawa Blog — Group travel guides, money tips, AI planning",
    description:
      "Long-form guides on planning group trips, splitting expenses, and using AI to draft itineraries.",
  },
};

function TagChip({ tag }: { tag: keyof typeof TAGS }) {
  const hue = TAGS[tag].hue;
  return (
    <span
      className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-black tracking-widest uppercase"
      style={{ color: hue, borderColor: `${hue}55`, background: `${hue}10` }}
    >
      {tag}
    </span>
  );
}

const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * The blog as a departures hall in the flight-mode world: the newest
 * post is a boarding pass, the rest line up on a departures board —
 * every post is a flight you can catch.
 */
export default function BlogIndex() {
  const sorted = [...BLOG_POSTS].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  const [featured, ...rest] = sorted;

  return (
    <SkyShell word="BLOG" active="blog">
      <main className="px-6">
        {/* hero */}
        <section className="max-w-5xl mx-auto pt-40 pb-14 text-center">
          <div className="flex justify-center" style={{ animation: "vx-in 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
            <GateChip hue="#5B4BD9">دفتر الرحلة · The flight journal</GateChip>
          </div>
          <h1
            className="mt-6 font-black tracking-[-0.03em] leading-[0.95]"
            style={{ fontSize: "clamp(44px, 8vw, 96px)", animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.06s both" }}
          >
            Read before
            <br />
            <span className="text-[#5B4BD9]">boarding.</span>
          </h1>
          <p
            className="mt-6 text-lg sm:text-xl font-medium text-[#141414]/60 max-w-xl mx-auto"
            style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.12s both" }}
          >
            Guides for crews who actually take the trip — the plan, the money,
            the memories. نروح سوا.
          </p>
        </section>

        {/* featured post = a boarding pass */}
        <section className="max-w-5xl mx-auto" style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.18s both" }}>
          <Link
            href={`/blog/${featured.slug}`}
            className="group block bg-white rounded-[30px] border border-black/10 overflow-hidden shadow-[0_44px_110px_-40px_rgba(10,14,24,0.4)] hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="relative aspect-[21/8] sm:aspect-[21/6] overflow-hidden">
              <PostCover tag={featured.tag} className="transition-transform duration-700 group-hover:scale-[1.03]" />
            </div>
            <div className="p-7 sm:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <TagChip tag={featured.tag} />
                <GateChip hue="#8F6400">Featured · الأبرز</GateChip>
              </div>
              <h2 className="mt-4 text-2xl sm:text-4xl font-black tracking-[-0.02em] leading-[1.1] max-w-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-[#141414]/60 leading-relaxed max-w-2xl">
                {featured.description}
              </p>

              {/* pass stub */}
              <div className="mt-8 pt-6 border-t border-dashed border-black/15 flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-center gap-5 text-[11px] font-black tracking-[0.14em] uppercase text-[#141414]/45">
                  <span>{dateShort(featured.publishedAt)}</span>
                  <span>T−{featured.readMinutes} min read</span>
                  <span className="hidden sm:inline">By {featured.author}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Barcode className="w-32 hidden sm:block" />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#141414] text-white px-4 py-2 text-sm font-bold group-hover:bg-[#5B4BD9] transition-colors">
                    Board this one
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* the departures board */}
        <section className="max-w-5xl mx-auto mt-14" style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.26s both" }}>
          <div className="bg-white/85 backdrop-blur-md rounded-[30px] border border-black/10 overflow-hidden shadow-[0_36px_90px_-40px_rgba(10,14,24,0.35)]">
            <div className="flex items-center justify-between px-7 sm:px-10 py-5">
              <p className="text-[12px] font-black tracking-[0.22em] uppercase">
                Departures · <span className="text-[#141414]/50">المغادرة</span>
              </p>
              <p className="text-[11px] font-black tracking-[0.14em] uppercase text-[#141414]/40">
                {rest.length} flights
              </p>
            </div>
            {/* column labels */}
            <div className="hidden sm:grid grid-cols-[92px_1fr_74px_86px_44px] gap-5 items-center px-7 sm:px-10 pb-3 text-[9px] font-black tracking-[0.2em] uppercase text-[#141414]/35">
              <span>Flight</span>
              <span>Destination</span>
              <span>Date</span>
              <span>Duration</span>
              <span>Gate</span>
            </div>

            {rest.map((post, i) => {
              const hue = TAGS[post.tag].hue;
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group grid sm:grid-cols-[92px_1fr_74px_86px_44px] grid-cols-1 gap-2 sm:gap-5 sm:items-center px-7 sm:px-10 py-6 border-t border-black/[0.06] hover:bg-black/[0.025] transition-colors"
                >
                  <span
                    className="inline-flex w-fit items-center gap-2 text-[11px] font-black tracking-[0.1em] uppercase"
                    style={{ color: hue }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: hue }} />
                    PX-{String(i + 2).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-bold leading-snug group-hover:text-[#5B4BD9] transition-colors">
                      {post.title}
                    </span>
                    <span className="hidden sm:block text-sm text-[#141414]/50 mt-1 line-clamp-1">
                      {post.description}
                    </span>
                  </span>
                  <span className="text-[11px] font-black tracking-[0.08em] uppercase text-[#141414]/45">
                    {dateShort(post.publishedAt)}
                  </span>
                  <span className="text-[11px] font-black tracking-[0.08em] uppercase text-[#141414]/45">
                    T−{post.readMinutes} min
                  </span>
                  <span className="hidden sm:flex w-9 h-9 rounded-full border border-black/15 items-center justify-center group-hover:bg-[#141414] group-hover:border-[#141414] transition-colors">
                    <ArrowUpRight className="w-4 h-4 group-hover:text-white transition-colors" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </SkyShell>
  );
}

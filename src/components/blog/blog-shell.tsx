import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { TAGS, type BlogPostMeta } from "@/lib/blog/posts";
import { PostCover } from "@/components/blog/post-cover";
import { SkyShell, GateChip, Barcode } from "@/components/landing/sky-shell";

const SITE = "https://paxawa.com";

interface Props {
  post: BlogPostMeta;
  children: React.ReactNode;
  related: BlogPostMeta[];
}

const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Post chrome in the flight-mode world: the giant glass tag word floats
 * behind the sky, the hero reads like a gate announcement, the article
 * itself is a white paper card drifting on the sky, and the closing CTA
 * is a boarding pass. Prose styling stays in .blog-content (.blog-light
 * overrides in globals.css).
 */
export function BlogShell({ post, children, related }: Props) {
  const hue = TAGS[post.tag].hue;
  const publishedLong = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SkyShell word={post.tag.toUpperCase()} active="blog">
      <article className="blog-light px-6">
        {/* gate announcement */}
        <div className="max-w-3xl mx-auto pt-36 pb-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white/55 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-black tracking-[0.12em] uppercase text-[#141414]/55 hover:text-[#141414] transition-colors"
            style={{ animation: "vx-in 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All flights
          </Link>

          <div
            className="mt-6 flex flex-wrap items-center gap-3"
            style={{ animation: "vx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both" }}
          >
            <GateChip hue={hue}>Gate {post.tag}</GateChip>
            <GateChip hue="#0C7A6F">T−{post.readMinutes} min read</GateChip>
          </div>

          <h1
            className="mt-5 font-black tracking-[-0.025em] leading-[1.05]"
            style={{ fontSize: "clamp(34px, 5.5vw, 60px)", animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
          >
            {post.title}
          </h1>
          <p
            className="mt-5 text-lg sm:text-xl text-[#141414]/60 leading-relaxed"
            style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.16s both" }}
          >
            {post.description}
          </p>
          <div
            className="flex flex-wrap items-center gap-4 mt-6 text-[11px] font-black tracking-[0.14em] uppercase text-[#141414]/45"
            style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}
          >
            <time dateTime={post.publishedAt}>{publishedLong}</time>
            <span>By {post.author}</span>
          </div>
        </div>

        {/* cover in a glass frame */}
        <div
          className="max-w-5xl mx-auto"
          style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.24s both" }}
        >
          <div className="rounded-[32px] p-2.5 bg-white/60 backdrop-blur-sm border border-white/80 shadow-[0_44px_110px_-40px_rgba(10,14,24,0.4)]">
            <div className="relative aspect-[16/6] sm:aspect-[21/6] rounded-[24px] overflow-hidden">
              <PostCover tag={post.tag} />
            </div>
          </div>
        </div>

        {/* the article — a paper card on the sky */}
        <div className="max-w-3xl mx-auto mt-10">
          <div className="bg-white rounded-[28px] border border-black/[0.08] shadow-[0_36px_90px_-44px_rgba(10,14,24,0.35)] px-6 py-10 sm:px-12 sm:py-14 blog-content">
            {children}
          </div>
        </div>

        {/* boarding-pass CTA */}
        <section className="max-w-3xl mx-auto mt-14">
          <div className="bg-white rounded-[28px] border border-black/10 overflow-hidden shadow-[0_36px_90px_-44px_rgba(10,14,24,0.35)]">
            <div className="p-8 sm:p-10 text-center">
              <div className="flex justify-center">
                <GateChip hue="#5B4BD9">Now boarding · الصعود الآن</GateChip>
              </div>
              <h2 className="mt-4 text-2xl sm:text-4xl font-black tracking-[-0.02em]">
                Stop reading about trips.
                <br />
                <span className="text-[#5B4BD9]">اجمع سوا.</span>
              </h2>
              <p className="mt-4 text-[#141414]/60 max-w-md mx-auto">
                One home for the whole trip — the plan, the money, the
                memories. Free, in English and Arabic.
              </p>
              <Link
                href="/auth/signup"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#141414] text-white px-7 py-3.5 font-bold hover:bg-[#5B4BD9] transition-colors"
              >
                Board now
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="border-t border-dashed border-black/15 px-8 py-4 flex items-center justify-center gap-4">
              <Barcode className="w-36" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#141414]/40">
                Gate SAWA · Free forever
              </span>
            </div>
          </div>
        </section>

        {/* connecting flights */}
        {related.length > 0 && (
          <section className="max-w-3xl mx-auto mt-14">
            <p className="text-[12px] font-black tracking-[0.22em] uppercase text-[#141414]/50 mb-4 px-2">
              Connecting flights · تابع القراءة
            </p>
            <div className="bg-white/85 backdrop-blur-md rounded-[26px] border border-black/10 overflow-hidden">
              {related.map((r) => {
                const rHue = TAGS[r.tag].hue;
                return (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group flex items-center gap-4 px-6 sm:px-8 py-5 border-t first:border-t-0 border-black/[0.06] hover:bg-black/[0.025] transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rHue }} />
                    <span className="flex-1">
                      <span className="block font-bold leading-snug group-hover:text-[#5B4BD9] transition-colors">
                        {r.title}
                      </span>
                      <span className="block text-sm text-[#141414]/50 mt-0.5 line-clamp-1">
                        {r.description}
                      </span>
                    </span>
                    <span className="text-[10px] font-black tracking-[0.1em] uppercase text-[#141414]/40 shrink-0">
                      {dateShort(r.publishedAt)} · T−{r.readMinutes} min
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[#141414]/35 group-hover:text-[#141414] transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>

      {/* B26-r2: BreadcrumbList JSON-LD — Home › Blog › Post so the SERP
          shows a clean breadcrumb trail instead of the raw URL. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
              {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: `${SITE}/blog/${post.slug}`,
              },
            ],
          }),
        }}
      />
    </SkyShell>
  );
}

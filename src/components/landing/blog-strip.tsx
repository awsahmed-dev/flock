import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { BLOG_POSTS, TAGS } from "@/lib/blog/posts";
import { PostCover } from "@/components/blog/post-cover";

/**
 * Landing v4 — "From the blog" strip. Latest three posts with their
 * generated covers, sitting between the feature tabs and the closing
 * CTA so the homepage links into the content surface.
 */
export function BlogStrip() {
  const latest = [...BLOG_POSTS]
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 3);

  return (
    <section className="relative border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">
              04 · Go deeper
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.03em]">
              Guides for the crew&apos;s planner.
            </h2>
          </div>
          <Link
            href="/blog"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#B3A8FF] hover:text-white transition-colors"
          >
            All posts
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {latest.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/25 transition-colors"
            >
              <div className="relative aspect-[16/7] overflow-hidden">
                <PostCover
                  tag={p.tag}
                  className="transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="p-5">
                <span
                  className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase"
                  style={{
                    color: TAGS[p.tag].hue,
                    borderColor: `${TAGS[p.tag].hue}40`,
                    background: `${TAGS[p.tag].hue}12`,
                  }}
                >
                  {p.tag}
                </span>
                <h3 className="font-semibold mt-2.5 leading-snug line-clamp-2">
                  {p.title}
                </h3>
                <p className="mt-2 text-[11px] text-white/40">
                  {p.readMinutes} min read
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

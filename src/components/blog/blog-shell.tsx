import Link from "next/link";
import { ArrowRight, ArrowLeft, Calendar, Clock } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { TAGS, type BlogPostMeta } from "@/lib/blog/posts";
import { PostCover } from "@/components/blog/post-cover";

const SITE = "https://paxawa.com";

interface Props {
  post: BlogPostMeta;
  children: React.ReactNode;
  related: BlogPostMeta[];
}

/**
 * B26: shared chrome for blog posts. Header + footer + hero + related
 * strip live here so the post pages stay focused on prose. Keeps the
 * marketing surface dark like the landing — different from the in-app
 * light theme, intentionally.
 */
export function BlogShell({ post, children, related }: Props) {
  const publishedLong = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="min-h-screen blog-light bg-[#F6F5F1] text-[#1a1720] selection:bg-[#5B4BD9] selection:text-[#1a1720]">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F6F5F1]/85 border-b border-black/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center shrink-0 text-[#1a1720]"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="sm" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/blog"
              className="text-[#1a1720]/65 hover:text-[#1a1720] transition-colors hidden sm:inline"
            >
              All posts
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4BD9] text-white hover:bg-[#4A3BC9] px-4 py-2 font-medium transition-colors"
            >
              Start a trip
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <article>
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">
          <Link
            href="/blog"
            className="flex w-fit items-center gap-1.5 text-xs text-[#1a1720]/55 hover:text-[#1a1720] mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all posts
          </Link>
          <span
            className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase mb-4"
            style={{
              color: TAGS[post.tag].hue,
              borderColor: `${TAGS[post.tag].hue}40`,
              background: `${TAGS[post.tag].hue}12`,
            }}
          >
            {post.tag}
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1]">
            {post.title}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-[#1a1720]/70 leading-relaxed">
            {post.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-7 text-xs text-[#1a1720]/55">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <time dateTime={post.publishedAt}>{publishedLong}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {post.readMinutes} min read
            </span>
            <span>By {post.author}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="relative aspect-[16/6] sm:aspect-[21/6] rounded-3xl overflow-hidden border border-black/[0.08]">
            <PostCover tag={post.tag} />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-14 blog-content">
          {children}
        </div>

        <section className="border-t border-black/[0.08] py-20 px-6">
          <div className="max-w-3xl mx-auto rounded-3xl border border-black/10 bg-gradient-to-br from-[#5B4BD9]/12 via-white to-[#8F6400]/10 p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Stop reading about group trips. Take one.
            </h2>
            <p className="mt-3 text-[#1a1720]/70 max-w-xl mx-auto">
              One home for the whole trip — shared itinerary, Huddle decisions,
              receipt-scan expense splits, an offline day sheet, and the Wrap
              at the end. Free, in English and Arabic.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4BD9] text-white hover:bg-[#4A3BC9] px-5 py-3 mt-6 text-sm font-bold transition-colors"
            >
              Start your trip — free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-black/[0.08] py-20 px-6">
            <div className="max-w-7xl mx-auto">
              <p className="text-xs font-bold tracking-widest uppercase text-[#1a1720]/50 mb-5">
                Keep reading
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group rounded-2xl border border-black/10 bg-white overflow-hidden hover:border-black/25 transition-colors"
                  >
                    <div className="relative aspect-[16/7] overflow-hidden">
                      <PostCover tag={r.tag} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                    </div>
                    <div className="p-5">
                      <span
                        className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase"
                        style={{
                          color: TAGS[r.tag].hue,
                          borderColor: `${TAGS[r.tag].hue}40`,
                          background: `${TAGS[r.tag].hue}12`,
                        }}
                      >
                        {r.tag}
                      </span>
                      <h3 className="font-semibold mt-2 leading-snug">
                        {r.title}
                      </h3>
                      <p className="text-sm text-[#1a1720]/65 mt-2 line-clamp-2">
                        {r.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      <footer className="border-t border-black/[0.08] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-[#1a1720]">
            <Logo variant="full" size="xs" />
            <span className="text-[#1a1720]/25">·</span>
            <span className="text-[#1a1720]/50 text-xs">
              © {new Date().getFullYear()}
            </span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-[#1a1720]/50">
            <Link href="/blog" className="hover:text-[#1a1720] transition-colors">
              Blog
            </Link>
            <Link href="/terms" className="hover:text-[#1a1720] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#1a1720] transition-colors">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>

      {/* B26-r2: BreadcrumbList JSON-LD. Tells Google how the URL nests
          (Home › Blog › Post Title) so the SERP shows a clean breadcrumb
          trail instead of the raw URL. Rendered once per post by the
          shared shell so every post inherits it automatically. */}
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
    </div>
  );
}

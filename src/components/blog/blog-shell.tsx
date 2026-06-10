import Link from "next/link";
import { ArrowRight, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { BlogPostMeta } from "@/lib/blog/posts";

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
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center shrink-0 text-white"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="sm" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/blog"
              className="text-white/60 hover:text-white transition-colors hidden sm:inline"
            >
              All posts
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-4 py-2 font-medium transition-colors"
            >
              Try Paxawa
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <article>
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all posts
          </Link>
          <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-fuchsia-300 mb-4">
            {post.tag}
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1]">
            {post.title}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-white/65 leading-relaxed">
            {post.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-7 text-xs text-white/45">
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

        <div className="max-w-5xl mx-auto px-6">
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-white/[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.heroImage}
              alt={post.heroAlt}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
            <a
              href={post.heroCreditLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-4 text-[10px] text-white/60 hover:text-white/90 backdrop-blur px-2 py-0.5 rounded-full bg-black/30"
            >
              Photo · {post.heroCredit} / Unsplash
            </a>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-14 blog-content">
          {children}
        </div>

        <section className="border-t border-white/[0.06] py-20 px-6">
          <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-amber-500/10 p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
              Plan your next group trip on Paxawa
            </h2>
            <p className="mt-3 text-white/65 max-w-xl mx-auto">
              Shared itinerary, voting, multi-currency expenses, packing — all
              in one place. Free to start.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-5 py-3 mt-6 text-sm font-semibold transition-colors"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-white/[0.06] py-20 px-6">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-5">
                Keep reading
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/25 transition-colors"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.heroImage}
                        alt={r.heroAlt}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-fuchsia-300">
                        {r.tag}
                      </span>
                      <h3 className="font-semibold mt-2 leading-snug">
                        {r.title}
                      </h3>
                      <p className="text-sm text-white/60 mt-2 line-clamp-2">
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

      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-white">
            <Logo variant="full" size="xs" />
            <span className="text-white/20">·</span>
            <span className="text-white/40 text-xs">
              © {new Date().getFullYear()}
            </span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

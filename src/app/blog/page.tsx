import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { BLOG_POSTS, TAGS } from "@/lib/blog/posts";
import { PostCover } from "@/components/blog/post-cover";

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
      className="inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase"
      style={{ color: hue, borderColor: `${hue}40`, background: `${hue}12` }}
    >
      {tag}
    </span>
  );
}

/**
 * B26 → Blog v2: same chrome as the landing (nav links, brand CTA,
 * charcoal canvas), generated on-system covers instead of stock photos,
 * hue-coded tag chips. Featured (newest) post takes the wide card.
 */
export default function BlogIndex() {
  const sorted = [...BLOG_POSTS].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  const [featured, ...rest] = sorted;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-[#8B7CFF] selection:text-[#0D0D0D]">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0D0D0D]/75 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0 text-white" aria-label="Paxawa home">
            <Logo variant="full" size="sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/#features" className="text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors">
              Features
            </Link>
            <Link href="/#phases" className="text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors">
              How it works
            </Link>
            <span className="text-white px-3 py-1.5 rounded-full bg-white/[0.06] text-sm">Blog</span>
          </nav>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/auth/login"
              className="hidden sm:inline text-white/60 hover:text-white px-3 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8B7CFF] text-[#0D0D0D] hover:bg-[#9C8FFF] px-4 py-2 font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12">
        <p className="text-sm font-bold tracking-widest uppercase text-[#B3A8FF] mb-3">
          Paxawa Blog
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-3xl">
          Group travel, money, and AI itineraries —{" "}
          <span className="text-white/40">no fluff.</span>
        </h1>
        <p className="mt-5 text-lg text-white/60 max-w-2xl">
          Practical guides for travelers who actually want to take the trip,
          not just spend three weeks debating it in the group chat.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid sm:grid-cols-2 rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/25 transition-colors"
        >
          <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[280px] overflow-hidden">
            <PostCover tag={featured.tag} className="transition-transform duration-500 group-hover:scale-[1.02]" />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <TagChip tag={featured.tag} />
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">
                Featured
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-tight">
              {featured.title}
            </h2>
            <p className="mt-4 text-white/65 leading-relaxed line-clamp-3">
              {featured.description}
            </p>
            <div className="flex items-center gap-4 mt-5 text-xs text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <time dateTime={featured.publishedAt}>
                  {new Date(featured.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {featured.readMinutes} min read
              </span>
              <span className="ms-auto inline-flex items-center gap-1 font-semibold text-[#B3A8FF]">
                Read it <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {rest.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid sm:grid-cols-2 gap-6">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/25 transition-colors"
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  <PostCover tag={p.tag} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                </div>
                <div className="p-6">
                  <TagChip tag={p.tag} />
                  <h3 className="text-lg font-semibold mt-3 leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-sm text-white/60 mt-2 line-clamp-2">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-3 mt-4 text-[11px] text-white/40">
                    <time dateTime={p.publishedAt}>
                      {new Date(p.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{p.readMinutes} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
            <Link href="/" className="hover:text-white transition-colors">
              Home
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

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
    <div className="min-h-screen blog-light bg-[#F6F5F1] text-[#1a1720] selection:bg-[#5B4BD9] selection:text-[#1a1720]">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F6F5F1]/85 border-b border-black/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0 text-[#1a1720]" aria-label="Paxawa home">
            <Logo variant="full" size="sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/#features" className="text-[#1a1720]/65 hover:text-[#1a1720] px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors">
              Features
            </Link>
            <Link href="/#phases" className="text-[#1a1720]/65 hover:text-[#1a1720] px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors">
              How it works
            </Link>
            <span className="text-[#1a1720] px-3 py-1.5 rounded-full bg-white/[0.06] text-sm">Blog</span>
          </nav>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/auth/login"
              className="hidden sm:inline text-[#1a1720]/65 hover:text-[#1a1720] px-3 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4BD9] text-white hover:bg-[#4A3BC9] px-4 py-2 font-bold transition-colors"
            >
              Start a trip
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <p className="text-sm font-bold tracking-widest uppercase text-[#B3A8FF] mb-3">
          Paxawa Blog
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] max-w-3xl">
          Group travel, money, and AI itineraries —{" "}
          <span className="text-[#1a1720]/50">no fluff.</span>
        </h1>
        <p className="mt-5 text-lg text-[#1a1720]/65 max-w-2xl">
          Practical guides for travelers who actually want to take the trip,
          not just spend three weeks debating it in the group chat.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid sm:grid-cols-2 rounded-3xl border border-black/10 bg-white overflow-hidden hover:border-black/25 transition-colors"
        >
          <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[280px] overflow-hidden">
            <PostCover tag={featured.tag} className="transition-transform duration-500 group-hover:scale-[1.02]" />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <TagChip tag={featured.tag} />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#1a1720]/40">
                Featured
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-tight">
              {featured.title}
            </h2>
            <p className="mt-4 text-[#1a1720]/70 leading-relaxed line-clamp-3">
              {featured.description}
            </p>
            <div className="flex items-center gap-4 mt-5 text-xs text-[#1a1720]/55">
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
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded-2xl border border-black/10 bg-white overflow-hidden hover:border-black/25 transition-colors"
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  <PostCover tag={p.tag} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                </div>
                <div className="p-6">
                  <TagChip tag={p.tag} />
                  <h3 className="text-lg font-semibold mt-3 leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[#1a1720]/65 mt-2 line-clamp-2">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-3 mt-4 text-[11px] text-[#1a1720]/50">
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
            <Link href="/" className="hover:text-[#1a1720] transition-colors">
              Home
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
    </div>
  );
}

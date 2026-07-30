import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
import { MARKETING_LIGHT_VARS } from "@/components/landing/marketing-light";

/**
 * Shared chrome for /terms and /privacy. Slim top bar (just the wordmark
 * + back-to-home), one-column reading container, footer with cross-links.
 *
 * Kept server-renderable + un-animated — legal pages should be boring
 * fast-loading text. No motion library, no client JS needed.
 */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        ...MARKETING_LIGHT_VARS,
        background: "linear-gradient(180deg, #DCE8EF 0%, #F6F5F1 340px)",
      }}
    >
      <header className="border-b border-black/[0.08] sticky top-0 bg-[#F6F5F1]/85 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-foreground"
            aria-label="Paxawa home"
          >
            <Logo variant="full" size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#5B4BD9] mb-2">
          Paxawa · Ground control
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Last updated · {lastUpdated}
        </p>

        {/* Manual typography styling — no @tailwindcss/typography dependency.
            Hand-tuned for legal-text readability without bringing in a plugin. */}
        <div className="mt-8 text-foreground/80 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_a]:text-primary hover:[&_a]:underline [&_strong]:text-foreground [&_strong]:font-semibold">
          {children}
        </div>
      </main>

      <footer className="border-t border-black/[0.08] mt-16 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Paxawa</p>
          <nav className="flex items-center gap-5">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <a
              href="mailto:hello@paxawa.com"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

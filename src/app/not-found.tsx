import Link from "next/link";
import { House as Home, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";

/**
 * 404 page. Replaces Next's default plain "404 This page could not be
 * found" block. Branded with the indigo gradient + a recovery card so
 * users don't bounce when they hit a stale share link or a typo.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 shadow-xl text-center">
        <div className="mx-auto mb-5 text-foreground inline-flex">
          <Logo variant="mark" size="xl" />
        </div>
        <p className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
          404 — off the map
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          That trip's not here
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          The link might be wrong, the trip may have been deleted, or you don't
          have access. Head back home and try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-foreground font-bold text-sm px-4 py-2.5 hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

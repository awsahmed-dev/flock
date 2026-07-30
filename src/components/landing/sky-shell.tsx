import Link from "next/link";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Logo } from "@/components/ui/logo";
import { MARKETING_LIGHT_VARS } from "@/components/landing/marketing-light";

// Arabic garnish on the sky pages uses the app's Arabic face; Latin stays
// on Inter via the --font-sans variable the root layout always attaches.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic-x",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

/**
 * The vision-x world as chrome for content pages (blog, legal). Fixed
 * flight-mode sky with the runway grid and drifting cloud puffs, a giant
 * glass word floating behind the content, the same floating pill nav,
 * and a ground-crew footer. Server-renderable — no client JS.
 */
export function SkyShell({
  word,
  active,
  children,
}: {
  /** giant .vx-glass word pinned behind the page, e.g. "BLOG" */
  word?: string;
  /** which pill-nav item is current */
  active?: "blog";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${plexArabic.variable} relative min-h-screen overflow-x-clip text-[#141414]`}
      style={{
        ...MARKETING_LIGHT_VARS,
        background: "linear-gradient(180deg, #BFD9EC 0%, #D8E6EE 34%, #EEF0EE 70%, #F6F5F1 100%)",
        fontFamily: "var(--font-sans), var(--font-arabic-x), system-ui, sans-serif",
      }}
    >
      {/* runway grid */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(#141414 1px, transparent 1px), linear-gradient(90deg, #141414 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* drifting cloud puffs */}
      <div
        aria-hidden
        className="fixed -top-24 -start-40 w-[42rem] h-[18rem] rounded-full bg-white/60 blur-[80px] pointer-events-none"
        style={{ animation: "vx-drift 14s ease-in-out infinite alternate" }}
      />
      <div
        aria-hidden
        className="fixed top-[38%] -end-48 w-[46rem] h-[20rem] rounded-full bg-white/50 blur-[90px] pointer-events-none"
        style={{ animation: "vx-drift 18s ease-in-out infinite alternate-reverse" }}
      />
      <div
        aria-hidden
        className="fixed bottom-[-6rem] start-[20%] w-[38rem] h-[16rem] rounded-full bg-white/45 blur-[85px] pointer-events-none"
        style={{ animation: "vx-drift 16s ease-in-out infinite alternate" }}
      />

      {/* giant glass word floating behind everything */}
      {word && (
        <p
          aria-hidden
          className="vx-glass fixed top-[16vh] inset-x-0 text-center font-black leading-none select-none pointer-events-none"
          style={{ fontSize: "clamp(90px, 17vw, 260px)", letterSpacing: "-0.03em" }}
        >
          {word}
        </p>
      )}

      {/* floating pill nav — same silhouette as the homepage */}
      <header className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto flex items-center gap-4 sm:gap-5 rounded-full px-5 py-2.5 backdrop-blur-md shadow-lg bg-white/85 text-[#141414]">
          <Link href="/" aria-label="Paxawa home" className="flex items-center">
            <Logo variant="full" size="xs" />
          </Link>
          <Link
            href="/blog"
            className={`text-[11px] font-black tracking-[0.14em] uppercase transition-opacity ${
              active === "blog" ? "opacity-100" : "opacity-45 hover:opacity-100"
            }`}
          >
            Blog
          </Link>
          <Link
            href="/auth/login"
            className="hidden sm:inline text-[11px] font-black tracking-[0.14em] uppercase opacity-45 hover:opacity-100 transition-opacity"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#141414] text-white px-4 py-1.5 text-sm font-bold hover:bg-[#5B4BD9] transition-colors"
          >
            ابدأ اليوم
          </Link>
        </div>
      </header>

      <div className="relative">{children}</div>

      {/* ground-crew footer */}
      <footer className="relative border-t border-black/[0.08] mt-24 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Logo variant="full" size="xs" />
            <span className="text-[#141414]/25">·</span>
            <span className="text-xs font-bold text-[#141414]/45">نروح سوا</span>
          </div>
          <nav className="flex items-center gap-5 text-[11px] font-black tracking-[0.12em] uppercase text-[#141414]/45">
            <Link href="/blog" className="hover:text-[#141414] transition-colors">
              Blog
            </Link>
            <Link href="/terms" className="hover:text-[#141414] transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[#141414] transition-colors">
              Privacy
            </Link>
            <span className="normal-case tracking-normal font-bold">© {new Date().getFullYear()} Paxawa</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** flight-chip: the little bordered uppercase chips vision-x uses everywhere */
export function GateChip({
  children,
  hue = "#0C7A6F",
}: {
  children: React.ReactNode;
  hue?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.14em] uppercase backdrop-blur-sm"
      style={{ color: hue, borderColor: `${hue}55`, background: "rgba(255,255,255,0.5)" }}
    >
      {children}
    </span>
  );
}

/** the barcode strip from the boarding passes */
export function Barcode({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-7 rounded-[3px] opacity-60 ${className ?? "w-40"}`}
      style={{
        background:
          "repeating-linear-gradient(90deg, #141414 0 2px, transparent 2px 4px, #141414 4px 7px, transparent 7px 9px, #141414 9px 10px, transparent 10px 14px)",
      }}
    />
  );
}

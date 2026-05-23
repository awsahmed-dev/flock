import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Vote,
  Wallet,
  FileText,
  ArrowRight,
  MapPin,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Collaborative Itinerary",
    description:
      "Build a day-by-day plan together. Every activity, stay, and meal in one place — proposed, discussed, and confirmed by the group.",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Vote,
    title: "Group Voting Engine",
    description:
      "Can't agree on a hotel? Put it to a vote. Attach cost estimates to each option so everyone sees what they're agreeing to.",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: Wallet,
    title: "Expense Splitting",
    description:
      "Log expenses, split them fairly, and track who owes whom. Expenses are linked to itinerary items so every cost has context.",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FileText,
    title: "Document Hub",
    description:
      "Visa docs, booking confirmations, Google Docs links, and trip photos — organized in one place, not buried in a group chat.",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

const steps = [
  {
    step: "1",
    title: "Create a trip",
    description: "Set your destination, dates, and optional budget.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    step: "2",
    title: "Invite your crew",
    description:
      "Share a link. Friends join with just their name — no account needed.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    step: "3",
    title: "Plan together",
    description:
      "Add itinerary items, vote on options, log expenses, and share files.",
    gradient: "from-emerald-500 to-teal-600",
  },
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: PageProps) {
  // Resilience guard: if Supabase Auth misroutes an OAuth callback to `/`
  // (e.g. Site URL set to the bare domain instead of /auth/callback, or a
  // www/non-www mismatch falling through to the Site URL fallback), catch
  // the orphaned `?code=...` here and route it to the real callback so the
  // session still gets created. Belt-and-braces against future misconfig.
  const sp = await searchParams;
  const code = sp.code;
  if (typeof code === "string" && code.length > 0) {
    const next = typeof sp.next === "string" ? sp.next : "/dashboard";
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
    );
  }
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Paxawa</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 border-0 shadow-sm">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-background dark:to-violet-950/20" />
          {/* Decorative blobs */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 to-violet-400/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-blue-400/10 to-emerald-400/10 blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-24 text-center">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 border border-primary/20 bg-primary/8 text-primary px-3 py-1"
            >
              <Sparkles className="w-3 h-3" />
              Group travel, finally figured out
            </Badge>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-[1.1]">
              Plan trips together,{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent">
                without the chaos
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              One place to build your itinerary, vote on decisions, split
              expenses, and share files. Stop juggling five apps and a group chat.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 border-0 shadow-md shadow-primary/25 px-8"
                >
                  Start planning for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="px-8 border-border/80">
                  Sign in
                </Button>
              </Link>
            </div>

            {/* Social proof pill */}
            <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["🧑‍✈️", "👩‍🦱", "🧔", "👩", "🧑"].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-primary/20 to-violet-200 flex items-center justify-center text-sm"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <span>Join thousands of groups planning smarter</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border/50 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
                Everything your group needs
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                From first idea to post-trip memories — Paxawa keeps your entire
                trip in one organized place.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-background rounded-2xl border border-border/60 p-6 flex flex-col gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">How it works</h2>
            <p className="text-muted-foreground text-lg">Up and running in under 2 minutes.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-10 max-w-3xl mx-auto">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="text-center flex flex-col items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} text-white font-bold text-xl flex items-center justify-center shadow-lg`}>
                  {s.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute translate-x-32 translate-y-6 w-16 h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div>
                  <h3 className="font-semibold mb-2 text-base">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-violet-600 to-blue-600">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-white leading-tight">
              The place where group decisions<br className="hidden sm:block" /> get made — and remembered
            </h2>
            <p className="text-white/75 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
              Every vote, every agreed plan, every expense — permanently
              captured. No more &ldquo;wait, what did we decide?&rdquo;
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="gap-2 bg-white text-primary hover:bg-white/90 font-semibold shadow-xl shadow-black/20 px-8"
              >
                Create your first trip <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
              <Users className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">Paxawa</span>
          </div>
          <p>Plan trips together, without the chaos.</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Paxawa v2 — P6 "Where to next" curated destinations for the dashboard
 * inspiration rail (the retention flywheel, planning §13). Gulf-relevant first
 * (where our Saudi/Gulf travelers actually go) plus global marquee picks. Each
 * carries a bilingual one-line hook so the Arabic-first app stays Arabic-first.
 *
 * v1 picks a rotating subset (stable per day) so the rail feels alive without a
 * per-user model; the structure leaves room to re-rank by the durable taste
 * vector later without touching the dashboard.
 */

export interface Destination {
  /** City/region name — used as the create-trip destination + Unsplash query. */
  name: string;
  /** Short region/country label under the name. */
  region: { en: string; ar: string };
  emoji: string;
  hook: { en: string; ar: string };
  /** Tailwind gradient fallback when no photo is available. */
  gradient: string;
}

export const DESTINATIONS: Destination[] = [
  {
    name: "AlUla",
    region: { en: "Saudi Arabia", ar: "السعودية" },
    emoji: "🏜️",
    hook: { en: "Ancient tombs in golden sandstone.", ar: "مقابر أثرية في حجر رملي ذهبي." },
    gradient: "from-amber-500 to-orange-600",
  },
  {
    name: "Istanbul",
    region: { en: "Türkiye", ar: "تركيا" },
    emoji: "🕌",
    hook: { en: "Two continents, one skyline.", ar: "قارّتان وأفقٌ واحد." },
    gradient: "from-rose-500 to-red-600",
  },
  {
    name: "Tokyo",
    region: { en: "Japan", ar: "اليابان" },
    emoji: "🗼",
    hook: { en: "Neon nights and quiet shrines.", ar: "ليالٍ نيون ومعابد هادئة." },
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    name: "Bali",
    region: { en: "Indonesia", ar: "إندونيسيا" },
    emoji: "🌴",
    hook: { en: "Rice terraces and slow mornings.", ar: "مدرّجات أرز وصباحات هادئة." },
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    name: "Maldives",
    region: { en: "Indian Ocean", ar: "المحيط الهندي" },
    emoji: "🏝️",
    hook: { en: "Overwater villas, glass-clear lagoons.", ar: "أكواخ فوق الماء وبحيرات صافية." },
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    name: "Tbilisi",
    region: { en: "Georgia", ar: "جورجيا" },
    emoji: "⛰️",
    hook: { en: "Old town charm, mountain air.", ar: "سحر المدينة القديمة وهواء الجبال." },
    gradient: "from-lime-500 to-emerald-600",
  },
  {
    name: "Cairo",
    region: { en: "Egypt", ar: "مصر" },
    emoji: "🐫",
    hook: { en: "Pyramids, bazaars, the Nile at dusk.", ar: "أهرامات وأسواق والنيل عند الغروب." },
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    name: "Bangkok",
    region: { en: "Thailand", ar: "تايلاند" },
    emoji: "🛺",
    hook: { en: "Street food and golden temples.", ar: "أكل الشارع والمعابد الذهبية." },
    gradient: "from-orange-500 to-pink-600",
  },
  {
    name: "Baku",
    region: { en: "Azerbaijan", ar: "أذربيجان" },
    emoji: "🔥",
    hook: { en: "Flame towers over the Caspian.", ar: "أبراج اللهب فوق بحر قزوين." },
    gradient: "from-red-500 to-rose-600",
  },
  {
    name: "Kuala Lumpur",
    region: { en: "Malaysia", ar: "ماليزيا" },
    emoji: "🌆",
    hook: { en: "Twin towers and jungle nearby.", ar: "البرجان التوأم والغابة قريبة." },
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    name: "Seoul",
    region: { en: "South Korea", ar: "كوريا الجنوبية" },
    emoji: "🏯",
    hook: { en: "Palaces by day, K-food by night.", ar: "قصور نهارًا وأكل كوري ليلًا." },
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Marrakech",
    region: { en: "Morocco", ar: "المغرب" },
    emoji: "🧿",
    hook: { en: "Souks, riads, desert at the edge.", ar: "أسواق ورياض وصحراء على الأطراف." },
    gradient: "from-pink-500 to-rose-600",
  },
];

/**
 * Pick a rotating subset of destinations. Deterministic per day (so it doesn't
 * reshuffle on every render) yet evolves over the week. Seedable so a future
 * taste-ranked version can drop in here without changing callers.
 */
export function pickSuggestedDestinations(count = 4, seed = dayOfYear()): Destination[] {
  const n = DESTINATIONS.length;
  const start = ((seed % n) + n) % n;
  const out: Destination[] = [];
  for (let i = 0; i < Math.min(count, n); i++) {
    out.push(DESTINATIONS[(start + i) % n]);
  }
  return out;
}

function dayOfYear(d = new Date()): number {
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - startOfYear) / 86_400_000);
}

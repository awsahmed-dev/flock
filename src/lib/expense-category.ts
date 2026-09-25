/**
 * B4: smart-category dictionary. Maps common expense keywords to a
 * category enum so users don't have to pick from a dropdown — typing
 * "burger" auto-suggests Food, "uber" → Transport, "hotel" → Stay.
 *
 * Categories are checked in the order of CATEGORY_ORDER and the first one
 * that matches wins, so more specific kinds come first: "تذاكر طيران"
 * (flight tickets) must land on transport before the bare "تذاكر" (tickets)
 * can pull it into activity.
 */

export type ExpenseCategory =
  | "accommodation"
  | "transport"
  | "food"
  | "activity"
  | "shopping"
  | "other";

const CATEGORY_ORDER: Exclude<ExpenseCategory, "other">[] = [
  "accommodation",
  "transport",
  "food",
  "activity",
  "shopping",
];

/* ── English ──────────────────────────────────────────────────────────── */

// Word-boundary matches so "ham" doesn't trigger on "hammock". Most
// keywords are common English + a smattering of travel-relevant brand
// names (Uber, Lyft, Airbnb, etc.).
const EN: Record<Exclude<ExpenseCategory, "other">, RegExp> = {
  accommodation: /\b(hotel|hostel|airbnb|motel|inn|resort|guesthouse|bnb|lodge|stay|villa|apartment|booking\.com|homestay)\b/i,
  transport: /\b(uber|lyft|taxi|cab|metro|subway|bus|train|flight|flights|airline|airfare|gas|petrol|fuel|parking|toll|grab|bolt|didi|careem|car rental|rental car|tram|lrt|mrt|ktm|ferry)\b/i,
  food: /\b(restaurant|cafe|coffee|breakfast|lunch|dinner|brunch|snack|drink|drinks|beer|wine|pizza|burger|sushi|noodle|noodles|ramen|kebab|taco|sandwich|bakery|bar|pub|takeout|delivery|starbucks|mcdonald'?s?|kfc|chipotle|street food|grocery|groceries|supermarket|food|meal|tip|shawarma|mandi|kabsa|zus)\b/i,
  activity: /\b(museum|ticket|tickets|tour|entrance|entry|attraction|park|temple|shrine|gallery|aquarium|zoo|theme park|concert|show|festival|guide|class|workshop|activity|hike|ski|surf|scuba|dive|sunset cruise|cruise|boulevard)\b/i,
  shopping: /\b(souvenir|gift|gifts|shop|store|mall|market|bazaar|clothing|clothes|shoes|fashion|cosmetics|perfume|electronics|book|gear|equipment|atm|withdrawal)\b/i,
};

/* ── Arabic and Malay ─────────────────────────────────────────────────── */

// `\b` in a JavaScript regex only knows ASCII letters, so it can never find
// a boundary inside Arabic text — which is why "قطار" (train) used to come
// back as "other". Arabic is matched by TOKEN instead: split the text on
// anything that isn't a letter, peel the clitics a word can carry
// ("والقطار", "بالتاكسي", "للفندق"), and look the stem up in a set. A set
// lookup can't misfire on a substring the way a loose regex would ("بار",
// bar, sits inside nothing it shouldn't).
//
// Deliberately ABSENT because each has a common second meaning: كريم (the
// Careem app, but also cream — "آيس كريم"), حلي (jewellery, not sweets),
// غدا (tomorrow, not lunch), عرض (a show, but also a shop "offer"), ايجار
// alone (rent — "ايجار سياره" is a car). "careem" in Latin letters still
// works, and the phrases cover the unambiguous forms.
//
// Stems are written already normalised (see `norm`): alef forms folded to
// ا, ى to ي, ة to ه, so "قهوة" is listed as "قهوه". Plurals are listed
// explicitly rather than guessed at.
const AR: Record<Exclude<ExpenseCategory, "other">, string[]> = {
  accommodation: [
    "فندق", "فنادق", "سكن", "شقه", "شقق", "شاليه", "شاليهات", "استراحه", "نزل", "منتجع",
    "اقامه", "غرفه", "غرف", "بوكينج",
  ],
  transport: [
    "قطار", "مترو", "باص", "باصات", "حافله", "تاكسي", "تكسي", "اوبر", "جيني",
    "طيران", "طائره", "طياره", "مطار", "رحله طيران", "مواصلات", "بنزين", "وقود", "موقف", "مواقف",
    "سياره", "تاجير", "ايجار سياره", "سابتكو", "الحرمين", "قطار الحرمين", "عباره", "رسوم عبور",
    // Malay
    "teksi", "kereta", "tambang", "minyak", "tol",
  ],
  food: [
    "مطعم", "مطاعم", "مقهي", "كافيه", "كوفي", "قهوه", "شاي", "فطور", "افطار", "غداء", "عشاء", "عشا",
    "سحور", "وجبه", "وجبات", "اكل", "طعام", "سناك", "حلا", "حلويات", "ايس كريم", "بقاله", "سوبرماركت",
    "هايبر", "شاورما", "مندي", "كبسه", "مظبي", "برجر", "بيتزا", "تمر", "تمور", "عصير", "مشروب",
    "مشروبات", "ماء", "مويه", "البيك", "بيك", "هرفي", "كودو", "ماكدونالدز", "ستاربكس", "دانكن",
    "بنده", "العثيم", "الدانوب", "التميمي", "كارفور", "لولو", "جاهز", "هنقرستيشن", "مرسول", "طلبات",
    // Malay
    "makan", "nasi", "mamak", "kopi", "roti", "restoran", "warung", "kedai", "teh",
  ],
  activity: [
    "تذكره", "تذاكر", "متحف", "متاحف", "جوله", "جولات", "دخول", "منتزه", "حديقه", "ملاهي",
    "بوليفارد", "موسم", "فعاليه", "فعاليات", "حفله", "حفلات", "غوص", "سفاري", "رحله بحريه",
    "العلا", "زياره",
  ],
  shopping: [
    "سوق", "اسواق", "مول", "هديه", "هدايا", "تذكار", "تذكارات", "ملابس", "عطر", "عطور", "بخور",
    "عود", "صراف", "سحب", "بازار", "تسوق", "مشتريات",
    // Malay
    "pasar", "beli",
  ],
};

/** Fold the spellings that vary without changing the word. */
function norm(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // harakat, dagger alef, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase();
}

// Single-word stems as a set per category; multi-word phrases kept aside
// and matched against the whole normalised string.
const AR_WORDS = new Map<Exclude<ExpenseCategory, "other">, Set<string>>();
const AR_PHRASES = new Map<Exclude<ExpenseCategory, "other">, string[]>();
for (const cat of CATEGORY_ORDER) {
  const all = AR[cat].map(norm);
  AR_WORDS.set(cat, new Set(all.filter((w) => !w.includes(" "))));
  AR_PHRASES.set(cat, all.filter((w) => w.includes(" ")));
}

/**
 * Every stem an Arabic token could be hiding: the word itself, and the word
 * with its leading clitics peeled — a conjunction (و، ف), then a preposition
 * (ب، ل، ك), then the article (ال) — plus "لل" (ل + ال, "for the").
 */
function stemsOf(token: string): string[] {
  const out = new Set<string>([token]);
  const conj = ["", "و", "ف"];
  const prep = ["", "ب", "ل", "ك"];
  for (const c of conj) {
    if (c && !token.startsWith(c)) continue;
    const a = token.slice(c.length);
    for (const p of prep) {
      if (p && !a.startsWith(p)) continue;
      const b = a.slice(p.length);
      out.add(b);
      if (b.startsWith("ال")) out.add(b.slice(2));
    }
    if (a.startsWith("لل")) out.add(a.slice(2));
  }
  return [...out].filter((s) => s.length >= 2);
}

function matchesArabicOrMalay(cat: Exclude<ExpenseCategory, "other">, text: string, tokens: string[][]): boolean {
  const words = AR_WORDS.get(cat)!;
  if (tokens.some((stems) => stems.some((s) => words.has(s)))) return true;
  return AR_PHRASES.get(cat)!.some((p) => text.includes(p));
}

/*
 * No fixed category order is right for every title. Accommodation has to
 * outrank transport for "حجز فندق" and "hotel shuttle", but then "taxi to the
 * hotel" reads as a stay — and flipping the order breaks "فندق قرب المطار"
 * (a hotel near the airport). The signal that actually separates them is
 * grammar: a word after "to / at / in / near" is WHERE it happened, not what
 * was paid for. So the first pass ignores those place words, and the second
 * pass — the old behaviour — only runs when the first finds nothing.
 */
const LOC_AR = new Set(["في", "الي", "قرب", "عند", "داخل", "بجانب", "جنب", "حول", "امام"]);
const LOC_EN = /\b(?:to|at|near|in|into|inside|from|outside)\s+(?:the\s+)?[\p{L}'.-]+/giu;

/** A token carrying "لـ" / "للـ" (to, for) is a destination, not a purchase. */
function isLocativeClitic(tok: string): boolean {
  return tok.startsWith("لل") || (tok.startsWith("ل") && tok.length > 3);
}

/**
 * Best-effort category inference from a free-text description. Returns
 * "other" when nothing matches. Call as the user types and use the
 * result to set the category icon and pre-fill the dropdown.
 */
export function inferCategory(description: string): ExpenseCategory {
  const raw = description.trim();
  if (!raw) return "other";
  const text = norm(raw);
  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const all = words.map(stemsOf);
  const primary = words
    .map((w, i) => ({ w, prev: words[i - 1] }))
    .filter(({ w, prev }) => !(prev && LOC_AR.has(prev)) && !isLocativeClitic(w))
    .map(({ w }) => stemsOf(w));
  const rawPrimary = raw.replace(LOC_EN, " ");

  for (const cat of CATEGORY_ORDER) {
    if (EN[cat].test(rawPrimary) || matchesArabicOrMalay(cat, text, primary)) return cat;
  }
  for (const cat of CATEGORY_ORDER) {
    if (EN[cat].test(raw) || matchesArabicOrMalay(cat, text, all)) return cat;
  }
  return "other";
}

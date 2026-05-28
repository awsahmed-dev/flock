/**
 * B4: smart-category dictionary. Maps common expense keywords to a
 * category enum so users don't have to pick from a dropdown — typing
 * "burger" auto-suggests Food, "uber" → Transport, "hotel" → Stay.
 *
 * Order matters: scanned top to bottom on substring match, so more
 * specific terms appear first.
 */

export type ExpenseCategory =
  | "accommodation"
  | "transport"
  | "food"
  | "activity"
  | "shopping"
  | "other";

interface Rule {
  match: RegExp;
  category: ExpenseCategory;
}

// Word-boundary matches so "ham" doesn't trigger on "hammock". Most
// keywords are common English + a smattering of travel-relevant brand
// names (Uber, Lyft, Airbnb, etc.).
const RULES: Rule[] = [
  // Accommodation
  { match: /\b(hotel|hostel|airbnb|motel|inn|resort|guesthouse|bnb|lodge|stay|villa|apartment|booking\.com)\b/i, category: "accommodation" },

  // Transport
  { match: /\b(uber|lyft|taxi|cab|metro|subway|bus|train|flight|airline|airfare|gas|petrol|fuel|parking|toll|grab|bolt|didi|car rental|rental car|tram)\b/i, category: "transport" },

  // Food
  { match: /\b(restaurant|cafe|coffee|breakfast|lunch|dinner|brunch|snack|drink|drinks|beer|wine|pizza|burger|sushi|noodle|noodles|ramen|kebab|taco|sandwich|bakery|bar|pub|takeout|delivery|starbucks|mcdonald'?s?|kfc|chipotle|street food|grocery|groceries|supermarket|food|meal|tip)\b/i, category: "food" },

  // Activity
  { match: /\b(museum|ticket|tour|entrance|entry|attraction|park|temple|shrine|gallery|aquarium|zoo|theme park|concert|show|festival|guide|class|workshop|activity|hike|ski|surf|scuba|dive|sunset cruise|cruise)\b/i, category: "activity" },

  // Shopping
  { match: /\b(souvenir|gift|shop|store|mall|market|clothing|clothes|shoes|fashion|cosmetics|electronics|book|gear|equipment|atm|withdrawal)\b/i, category: "shopping" },
];

/**
 * Best-effort category inference from a free-text description. Returns
 * "other" when nothing matches. Call as the user types and use the
 * result to set the category icon and pre-fill the dropdown.
 */
export function inferCategory(description: string): ExpenseCategory {
  const text = description.trim();
  if (!text) return "other";
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule.category;
  }
  return "other";
}

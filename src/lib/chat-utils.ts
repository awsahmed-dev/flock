// Shared chat utilities — no "use server", safe to import from both client and server

export type SiteType = "hotel" | "flight" | "maps" | "restaurant" | "activity" | "docs" | "other";

export function detectSiteType(url: string): {
  siteType: SiteType;
  siteName: string;
} {
  try {
    const { hostname, href } = new URL(url);
    const h = hostname.replace("www.", "");
    if (/booking\.com|hotels\.com|airbnb\.|expedia\.|marriott\.|hilton\.|hyatt\.|ihg\./.test(h))
      return { siteType: "hotel", siteName: h };
    if (/google\.com\/flights|kayak\.|skyscanner\.|flightradar|aviasales/.test(href))
      return { siteType: "flight", siteName: h };
    if (/maps\.google\.|maps\.apple\.|google\.com\/maps/.test(href))
      return { siteType: "maps", siteName: "Google Maps" };
    if (/docs\.google\.|drive\.google\.|notion\.so|dropbox\./.test(h))
      return { siteType: "docs", siteName: h };
    if (/tripadvisor\.|opentable\.|yelp\.|zomato\./.test(h))
      return { siteType: "restaurant", siteName: h };
    if (/viator\.|getyourguide\.|klook\./.test(h))
      return { siteType: "activity", siteName: h };
    return { siteType: "other", siteName: h };
  } catch {
    return { siteType: "other", siteName: url };
  }
}

export function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"]+/g) ?? [];
}

export function parseExpenseArgs(args: string): {
  amount: number;
  category: string;
  description: string;
  /** §10.8: optional explicit 3-letter code ("45 MYR lunch" / "MYR45 lunch").
   *  Absent → the caller falls back to the trip currency, never "$". */
  currency?: string;
} {
  const CATEGORIES = ["accommodation", "transport", "food", "activity", "shopping"];
  const parts = args.trim().split(/\s+/);
  // "MYR45" / "45MYR" / plain "45" (a bare "$" prefix is tolerated but ignored).
  const first = parts[0].replace("$", "");
  const inlineCur = first.match(/^([A-Za-z]{3})?(\d+(?:[.,]\d+)?)([A-Za-z]{3})?$/);
  const amount = inlineCur ? parseFloat(inlineCur[2].replace(",", ".")) || 0 : parseFloat(first) || 0;
  let currency = (inlineCur?.[1] || inlineCur?.[3])?.toUpperCase();
  let rest = parts.slice(1);
  // Standalone code as the next token: "/expense 45 MYR lunch".
  if (!currency && rest[0] && /^[A-Za-z]{3}$/.test(rest[0]) && !CATEGORIES.includes(rest[0].toLowerCase())) {
    currency = rest[0].toUpperCase();
    rest = rest.slice(1);
  }
  const categoryMatch = rest.find((p) => CATEGORIES.includes(p.toLowerCase()));
  const category = categoryMatch || "other";
  const description = rest.filter((p) => p.toLowerCase() !== category).join(" ").trim() || args;
  return { amount, category, description, ...(currency ? { currency } : {}) };
}

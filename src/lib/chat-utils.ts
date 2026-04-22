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
} {
  const CATEGORIES = ["accommodation", "transport", "food", "activity", "shopping"];
  const parts = args.trim().split(/\s+/);
  const amount = parseFloat(parts[0].replace("$", "")) || 0;
  const rest = parts.slice(1);
  const categoryMatch = rest.find((p) => CATEGORIES.includes(p.toLowerCase()));
  const category = categoryMatch || "other";
  const description = rest.filter((p) => p.toLowerCase() !== category).join(" ").trim() || args;
  return { amount, category, description };
}

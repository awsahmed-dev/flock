/**
 * B5: rough country → primary currency mapping used for the dual-currency
 * price display on the Plan page.
 *
 * The mental model: traveler logs an expense in *their* home/trip currency,
 * but wants to see what it'd look like in the local currency of the
 * destination so the on-ground price feels real. e.g. a USD-currency trip
 * to Japan shows "$25 ≈ ¥3,750" so $25 lunch reads as a regular meal,
 * not a guess.
 *
 * Resolution is best-effort: we substring-match destination text against
 * country/city names. When nothing matches we return null and the UI
 * just shows the trip currency.
 */

interface Entry {
  /** Match against the destination string (lower-cased). Order matters
   *  — longer / more specific terms first. */
  match: string;
  currency: string;
}

const RULES: Entry[] = [
  // Specific cities first
  { match: "tokyo", currency: "JPY" },
  { match: "kyoto", currency: "JPY" },
  { match: "osaka", currency: "JPY" },
  { match: "paris", currency: "EUR" },
  { match: "rome", currency: "EUR" },
  { match: "milan", currency: "EUR" },
  { match: "venice", currency: "EUR" },
  { match: "barcelona", currency: "EUR" },
  { match: "madrid", currency: "EUR" },
  { match: "lisbon", currency: "EUR" },
  { match: "amsterdam", currency: "EUR" },
  { match: "berlin", currency: "EUR" },
  { match: "munich", currency: "EUR" },
  { match: "athens", currency: "EUR" },
  { match: "santorini", currency: "EUR" },
  { match: "dublin", currency: "EUR" },
  { match: "london", currency: "GBP" },
  { match: "edinburgh", currency: "GBP" },
  { match: "manchester", currency: "GBP" },
  { match: "new york", currency: "USD" },
  { match: "nyc", currency: "USD" },
  { match: "los angeles", currency: "USD" },
  { match: "san francisco", currency: "USD" },
  { match: "miami", currency: "USD" },
  { match: "chicago", currency: "USD" },
  { match: "vegas", currency: "USD" },
  { match: "toronto", currency: "CAD" },
  { match: "vancouver", currency: "CAD" },
  { match: "montreal", currency: "CAD" },
  { match: "sydney", currency: "AUD" },
  { match: "melbourne", currency: "AUD" },
  { match: "auckland", currency: "NZD" },
  { match: "wellington", currency: "NZD" },
  { match: "dubai", currency: "AED" },
  { match: "abu dhabi", currency: "AED" },
  { match: "riyadh", currency: "SAR" },
  { match: "jeddah", currency: "SAR" },
  { match: "doha", currency: "QAR" },
  { match: "kuwait", currency: "KWD" },
  { match: "muscat", currency: "OMR" },
  { match: "cairo", currency: "EGP" },
  { match: "marrakech", currency: "MAD" },
  { match: "casablanca", currency: "MAD" },
  { match: "istanbul", currency: "TRY" },
  { match: "bangkok", currency: "THB" },
  { match: "phuket", currency: "THB" },
  { match: "chiang mai", currency: "THB" },
  { match: "bali", currency: "IDR" },
  { match: "jakarta", currency: "IDR" },
  { match: "kuala lumpur", currency: "MYR" },
  { match: "singapore", currency: "SGD" },
  { match: "hong kong", currency: "HKD" },
  { match: "seoul", currency: "KRW" },
  { match: "taipei", currency: "TWD" },
  { match: "manila", currency: "PHP" },
  { match: "ho chi minh", currency: "VND" },
  { match: "hanoi", currency: "VND" },
  { match: "mumbai", currency: "INR" },
  { match: "delhi", currency: "INR" },
  { match: "bangalore", currency: "INR" },
  { match: "kathmandu", currency: "NPR" },
  { match: "colombo", currency: "LKR" },
  { match: "dhaka", currency: "BDT" },
  { match: "karachi", currency: "PKR" },
  { match: "mexico city", currency: "MXN" },
  { match: "cancun", currency: "MXN" },
  { match: "rio", currency: "BRL" },
  { match: "sao paulo", currency: "BRL" },
  { match: "buenos aires", currency: "ARS" },
  { match: "lima", currency: "PEN" },
  { match: "bogota", currency: "COP" },
  { match: "santiago", currency: "CLP" },
  { match: "cape town", currency: "ZAR" },
  { match: "johannesburg", currency: "ZAR" },
  { match: "nairobi", currency: "KES" },
  { match: "lagos", currency: "NGN" },
  { match: "accra", currency: "GHS" },
  { match: "addis ababa", currency: "ETB" },
  // Countries
  { match: "japan", currency: "JPY" },
  { match: "france", currency: "EUR" },
  { match: "italy", currency: "EUR" },
  { match: "spain", currency: "EUR" },
  { match: "portugal", currency: "EUR" },
  { match: "germany", currency: "EUR" },
  { match: "netherlands", currency: "EUR" },
  { match: "belgium", currency: "EUR" },
  { match: "austria", currency: "EUR" },
  { match: "greece", currency: "EUR" },
  { match: "ireland", currency: "EUR" },
  { match: "finland", currency: "EUR" },
  { match: "uk", currency: "GBP" },
  { match: "united kingdom", currency: "GBP" },
  { match: "england", currency: "GBP" },
  { match: "scotland", currency: "GBP" },
  { match: "wales", currency: "GBP" },
  { match: "usa", currency: "USD" },
  { match: "united states", currency: "USD" },
  { match: "america", currency: "USD" },
  { match: "canada", currency: "CAD" },
  { match: "australia", currency: "AUD" },
  { match: "new zealand", currency: "NZD" },
  { match: "switzerland", currency: "CHF" },
  { match: "norway", currency: "NOK" },
  { match: "sweden", currency: "SEK" },
  { match: "denmark", currency: "DKK" },
  { match: "poland", currency: "PLN" },
  { match: "czech", currency: "CZK" },
  { match: "hungary", currency: "HUF" },
  { match: "uae", currency: "AED" },
  { match: "emirates", currency: "AED" },
  { match: "saudi", currency: "SAR" },
  { match: "qatar", currency: "QAR" },
  { match: "oman", currency: "OMR" },
  { match: "bahrain", currency: "BHD" },
  { match: "jordan", currency: "JOD" },
  { match: "lebanon", currency: "LBP" },
  { match: "egypt", currency: "EGP" },
  { match: "morocco", currency: "MAD" },
  { match: "tunisia", currency: "TND" },
  { match: "turkey", currency: "TRY" },
  { match: "thailand", currency: "THB" },
  { match: "indonesia", currency: "IDR" },
  { match: "malaysia", currency: "MYR" },
  { match: "philippines", currency: "PHP" },
  { match: "vietnam", currency: "VND" },
  { match: "korea", currency: "KRW" },
  { match: "taiwan", currency: "TWD" },
  { match: "china", currency: "CNY" },
  { match: "india", currency: "INR" },
  { match: "nepal", currency: "NPR" },
  { match: "sri lanka", currency: "LKR" },
  { match: "bangladesh", currency: "BDT" },
  { match: "pakistan", currency: "PKR" },
  { match: "mexico", currency: "MXN" },
  { match: "brazil", currency: "BRL" },
  { match: "argentina", currency: "ARS" },
  { match: "peru", currency: "PEN" },
  { match: "colombia", currency: "COP" },
  { match: "chile", currency: "CLP" },
  { match: "south africa", currency: "ZAR" },
  { match: "kenya", currency: "KES" },
  { match: "nigeria", currency: "NGN" },
  { match: "ghana", currency: "GHS" },
  { match: "ethiopia", currency: "ETB" },
  { match: "iceland", currency: "ISK" },
];

/**
 * Best-effort local-currency lookup. Returns NULL if no rule matches the
 * destination — caller hides the dual-currency display in that case.
 */
export function inferLocalCurrency(destination: string): string | null {
  const lower = destination.toLowerCase();
  for (const r of RULES) {
    if (lower.includes(r.match)) return r.currency;
  }
  return null;
}

/**
 * Pretty currency symbols for the few we use most often. Fallback is the
 * ISO code prefixed to the number.
 */
export function currencySymbol(ccy: string): string {
  const map: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", KRW: "₩",
    INR: "₹", AED: "د.إ", SAR: "ر.س", THB: "฿", IDR: "Rp",
    MYR: "RM", SGD: "S$", HKD: "HK$", TWD: "NT$", PHP: "₱",
    VND: "₫", TRY: "₺", BRL: "R$", MXN: "$", CAD: "C$",
    AUD: "A$", NZD: "NZ$", CHF: "CHF", NOK: "kr", SEK: "kr",
    DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft", ZAR: "R",
    EGP: "£E", NGN: "₦", KES: "KSh", ARS: "$", CLP: "$",
    PEN: "S/", COP: "$",
  };
  return map[ccy.toUpperCase()] ?? `${ccy} `;
}

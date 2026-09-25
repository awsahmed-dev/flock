import { foldArabic } from "@/lib/packages/library";

/**
 * Just enough airports to answer one question: does this flight land in the
 * city the route starts in? Not a directory — the Gulf, the cities Sawia's
 * travellers fly between most, and their Arabic names. An unknown code simply
 * isn't checked, so a gap here costs a missing hint, never a wrong one.
 */
const AIRPORTS: Record<string, [en: string, ar: string, ...aliases: string[]]> = {
  // Saudi Arabia
  RUH: ["Riyadh", "الرياض"],
  JED: ["Jeddah", "جدة", "jiddah", "jedda"],
  DMM: ["Dammam", "الدمام", "khobar", "الخبر"],
  MED: ["Medina", "المدينة", "madinah", "المدينة المنورة"],
  AHB: ["Abha", "أبها"],
  TIF: ["Taif", "الطائف"],
  TUU: ["Tabuk", "تبوك"],
  ULH: ["AlUla", "العلا", "al ula", "al-ula"],
  GIZ: ["Jazan", "جازان", "jizan"],
  ELQ: ["Buraidah", "بريدة", "qassim", "القصيم"],
  HAS: ["Hail", "حائل"],
  NUM: ["NEOM", "نيوم"],
  YNB: ["Yanbu", "ينبع"],
  // Gulf and nearby
  DXB: ["Dubai", "دبي"],
  AUH: ["Abu Dhabi", "أبوظبي", "ابو ظبي"],
  DOH: ["Doha", "الدوحة"],
  BAH: ["Bahrain", "البحرين", "manama", "المنامة"],
  KWI: ["Kuwait", "الكويت"],
  MCT: ["Muscat", "مسقط"],
  AMM: ["Amman", "عمّان", "عمان"],
  CAI: ["Cairo", "القاهرة"],
  IST: ["Istanbul", "إسطنبول", "اسطنبول"],
  SAW: ["Istanbul", "إسطنبول", "اسطنبول"],
  // South-east Asia
  KUL: ["Kuala Lumpur", "كوالالمبور", "kl"],
  SIN: ["Singapore", "سنغافورة"],
  CGK: ["Jakarta", "جاكرتا"],
  BKK: ["Bangkok", "بانكوك"],
  PEN: ["Penang", "بينانغ"],
};

const fold = (s: string) => foldArabic(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Every name a place string could mean: the code's city names, or itself. */
export function namesForPlace(place: string): string[] {
  const code = place.trim().toUpperCase();
  const hit = AIRPORTS[code];
  return (hit ? hit : [place]).map(fold).filter(Boolean);
}

/** Show a place the way the reader will recognise it: "RUH" → "Riyadh"/"الرياض". */
export function placeLabel(place: string, locale: "en" | "ar"): string {
  const hit = AIRPORTS[place.trim().toUpperCase()];
  return hit ? (locale === "ar" ? hit[1] : hit[0]) : place;
}

/**
 * Do these two describe the same city? Knows only what the table knows: a
 * code it has never heard of is compared as plain text, and "no" from an
 * unknown pairing is never treated as proof of a mismatch by the caller.
 */
export function samePlace(a: string, b: string[]): boolean {
  const as = new Set(namesForPlace(a));
  return b.map(fold).some((n) => as.has(n) || [...as].some((x) => x.includes(n) || n.includes(x)));
}

export function isKnownAirport(place: string): boolean {
  return !!AIRPORTS[place.trim().toUpperCase()];
}

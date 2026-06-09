/**
 * B12: pure data — destination-aware packing suggestions.
 *
 * Lives outside the "use server" packing actions module so it can be
 * imported both by `seedSuggestedPacking` (user-triggered) and
 * `createTrip` (auto-seed) without smuggling a pure function through
 * the server-action graph.
 *
 * B15-d: the second arg is a BCP-47 language tag — pass "ar" and we
 * return Arabic labels (مظلة قابلة للطي etc.). Defaults to English so
 * existing callers keep working unchanged.
 */

export interface PackingSuggestion {
  label: string;
  category: string;
}

const AR_TRANSLATIONS: Record<string, string> = {
  // Docs
  "Passport": "جواز السفر",
  "Travel insurance card": "بطاقة تأمين السفر",
  "Boarding passes / tickets": "بطاقات الصعود / التذاكر",
  // Tech
  "Phone charger": "شاحن الجوال",
  "Power bank": "باور بانك",
  "Adapter / plug converter": "محوّل قابس",
  "Headphones": "سمّاعات",
  "Headlamp": "كشّاف رأس",
  // Toiletries
  "Toothbrush": "فرشاة أسنان",
  "Toothpaste": "معجون أسنان",
  "Deodorant": "مزيل عرق",
  "Sunscreen": "واقي شمس",
  "Lip balm with SPF": "مرطّب شفاه بواقي شمس",
  "After-sun lotion": "مرطّب ما بعد الشمس",
  "Insect repellent": "طارد حشرات",
  // Medical
  "First-aid kit": "حقيبة إسعافات أوّلية",
  "Painkillers": "مسكّنات ألم",
  "Blister kit": "ضمّادات احتكاك",
  // Clothing
  "Underwear (one per day)": "ملابس داخلية (لكل يوم قطعة)",
  "Socks (one per day)": "جوارب (لكل يوم زوج)",
  "Comfortable walking shoes": "حذاء مشي مريح",
  "Swimsuit": "ملابس سباحة",
  "Sandals / flip-flops": "صنادل / شباشب",
  "Sunglasses": "نظارة شمسية",
  "Ski gloves": "قفازات تزلج",
  "Thermal base layers": "ملابس داخلية حرارية",
  "Wool socks": "جوارب صوف",
  "Hiking boots": "حذاء مشي جبلي",
  "Rain jacket": "جاكيت ضد المطر",
  "Slip-on shoes (temple visits)": "حذاء سهل اللبس (لزيارة المعابد)",
  "Scarf / shawl": "وشاح / شال",
  // General
  "Reusable water bottle": "قارورة ماء قابلة للاستخدام",
  "Day bag / backpack": "حقيبة ظهر يومية",
  "Beach towel": "منشفة شاطئ",
  "Pocket tissue / wet wipes": "مناديل ورقية / مناديل مبلّلة",
  "Compact umbrella": "مظلّة قابلة للطي",
  "Cooling towel": "منشفة تبريد",
};

export function buildPackingSuggestions(
  destination: string,
  locale: string = "en",
): PackingSuggestion[] {
  const baseSuggestions: PackingSuggestion[] = [
    // Docs
    { label: "Passport", category: "docs" },
    { label: "Travel insurance card", category: "docs" },
    { label: "Boarding passes / tickets", category: "docs" },
    // Tech
    { label: "Phone charger", category: "tech" },
    { label: "Power bank", category: "tech" },
    { label: "Adapter / plug converter", category: "tech" },
    { label: "Headphones", category: "tech" },
    // Toiletries
    { label: "Toothbrush", category: "toiletries" },
    { label: "Toothpaste", category: "toiletries" },
    { label: "Deodorant", category: "toiletries" },
    { label: "Sunscreen", category: "toiletries" },
    // Medical
    { label: "First-aid kit", category: "medical" },
    { label: "Painkillers", category: "medical" },
    // Clothing essentials
    { label: "Underwear (one per day)", category: "clothes" },
    { label: "Socks (one per day)", category: "clothes" },
    { label: "Comfortable walking shoes", category: "clothes" },
    // General
    { label: "Reusable water bottle", category: "general" },
    { label: "Day bag / backpack", category: "general" },
  ];

  const dest = destination?.toLowerCase() ?? "";
  const extras: PackingSuggestion[] = [];
  if (/(beach|bali|maldives|hawaii|cancun|phuket|santorini)/.test(dest)) {
    extras.push(
      { label: "Swimsuit", category: "clothes" },
      { label: "Sandals / flip-flops", category: "clothes" },
      { label: "Sunglasses", category: "clothes" },
      { label: "Beach towel", category: "general" },
      { label: "After-sun lotion", category: "toiletries" },
    );
  }
  if (/(ski|snow|alps|aspen|whistler|hokkaido)/.test(dest)) {
    extras.push(
      { label: "Ski gloves", category: "clothes" },
      { label: "Thermal base layers", category: "clothes" },
      { label: "Wool socks", category: "clothes" },
      { label: "Lip balm with SPF", category: "toiletries" },
    );
  }
  if (/(hike|trek|mountain|patagonia|kilimanjaro|nepal|himalaya)/.test(dest)) {
    extras.push(
      { label: "Hiking boots", category: "clothes" },
      { label: "Rain jacket", category: "clothes" },
      { label: "Headlamp", category: "tech" },
      { label: "Blister kit", category: "medical" },
    );
  }
  if (/(japan|korea|taiwan|thailand|vietnam|indonesia|china|hong kong|singapore|asia)/.test(dest)) {
    extras.push(
      { label: "Slip-on shoes (temple visits)", category: "clothes" },
      { label: "Pocket tissue / wet wipes", category: "general" },
    );
  }
  if (/(europe|paris|rome|barcelona|prague|london|berlin)/.test(dest)) {
    extras.push(
      { label: "Compact umbrella", category: "general" },
      { label: "Scarf / shawl", category: "clothes" },
    );
  }
  // B12: Malaysia / SAR-region travelers
  if (/(malaysia|kuala lumpur|penang|singapore|thailand|vietnam|cambodia)/.test(dest)) {
    extras.push(
      { label: "Insect repellent", category: "toiletries" },
      { label: "Cooling towel", category: "general" },
    );
  }

  const all = [...baseSuggestions, ...extras];
  if (locale === "ar") {
    return all.map((s) => ({
      ...s,
      label: AR_TRANSLATIONS[s.label] ?? s.label,
    }));
  }
  return all;
}

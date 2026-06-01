/**
 * B12: pure data — destination-aware packing suggestions.
 *
 * Lives outside the "use server" packing actions module so it can be
 * imported both by `seedSuggestedPacking` (user-triggered) and
 * `createTrip` (auto-seed) without smuggling a pure function through
 * the server-action graph.
 */

export interface PackingSuggestion {
  label: string;
  category: string;
}

export function buildPackingSuggestions(destination: string): PackingSuggestion[] {
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
    { label: "Underwear (one per day)", category: "clothing" },
    { label: "Socks (one per day)", category: "clothing" },
    { label: "Comfortable walking shoes", category: "clothing" },
    // General
    { label: "Reusable water bottle", category: "general" },
    { label: "Day bag / backpack", category: "general" },
  ];

  const dest = destination?.toLowerCase() ?? "";
  const extras: PackingSuggestion[] = [];
  if (/(beach|bali|maldives|hawaii|cancun|phuket|santorini)/.test(dest)) {
    extras.push(
      { label: "Swimsuit", category: "clothing" },
      { label: "Sandals / flip-flops", category: "clothing" },
      { label: "Sunglasses", category: "clothing" },
      { label: "Beach towel", category: "general" },
      { label: "After-sun lotion", category: "toiletries" },
    );
  }
  if (/(ski|snow|alps|aspen|whistler|hokkaido)/.test(dest)) {
    extras.push(
      { label: "Ski gloves", category: "clothing" },
      { label: "Thermal base layers", category: "clothing" },
      { label: "Wool socks", category: "clothing" },
      { label: "Lip balm with SPF", category: "toiletries" },
    );
  }
  if (/(hike|trek|mountain|patagonia|kilimanjaro|nepal|himalaya)/.test(dest)) {
    extras.push(
      { label: "Hiking boots", category: "clothing" },
      { label: "Rain jacket", category: "clothing" },
      { label: "Headlamp", category: "tech" },
      { label: "Blister kit", category: "medical" },
    );
  }
  if (/(japan|korea|taiwan|thailand|vietnam|indonesia|china|hong kong|singapore|asia)/.test(dest)) {
    extras.push(
      { label: "Slip-on shoes (temple visits)", category: "clothing" },
      { label: "Pocket tissue / wet wipes", category: "general" },
    );
  }
  if (/(europe|paris|rome|barcelona|prague|london|berlin)/.test(dest)) {
    extras.push(
      { label: "Compact umbrella", category: "general" },
      { label: "Scarf / shawl", category: "clothing" },
    );
  }
  // B12: Malaysia / SAR-region travelers
  if (/(malaysia|kuala lumpur|penang|singapore|thailand|vietnam|cambodia)/.test(dest)) {
    extras.push(
      { label: "Insect repellent", category: "toiletries" },
      { label: "Cooling towel", category: "general" },
    );
  }

  return [...baseSuggestions, ...extras];
}

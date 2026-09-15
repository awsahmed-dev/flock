/**
 * One currency list for every surface that picks a currency.
 *
 * Video-QA (2026-09-13): the trip-creation budget step exposed only six
 * currencies while the expense dialog offered this full list — so a user
 * creating a Japan trip couldn't set a JPY budget, then logged JPY
 * expenses against it anyway. Gulf + regional majors first, the rest of
 * the world's majors after.
 */
export const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF",
  "CNY", "AED", "SAR", "INR", "THB", "IDR", "MYR",
  "SGD", "HKD", "KRW", "TWD", "TRY", "MXN", "BRL",
  "ZAR", "EGP", "NZD", "NOK", "SEK", "DKK", "PLN",
];

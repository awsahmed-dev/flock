/**
 * Numeric helpers shared between expense / budget / vote-cost inputs.
 *
 * Pure functions — safe to import on server or client.
 */

// Eastern Arabic ٠-٩ (U+0660–U+0669) and Persian/Urdu ۰-۹ (U+06F0–U+06F9).
// Browsers' built-in `<input type="number">` validators reject these
// natively, so we normalize on input rather than fight the platform.
const ARABIC_DIGIT_RANGE: [number, number] = [0x0660, 0x0669];
const PERSIAN_DIGIT_RANGE: [number, number] = [0x06f0, 0x06f9];

/**
 * Map ٠١٢٣٤٥٦٧٨٩ / ۰۱۲۳۴۵۶۷۸۹ to ASCII 0-9. Also normalizes Arabic comma
 * (٫ U+066B) to a regular decimal point. Anything else passes through.
 */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= ARABIC_DIGIT_RANGE[0] && code <= ARABIC_DIGIT_RANGE[1]) {
      out += String.fromCharCode(code - ARABIC_DIGIT_RANGE[0] + 0x30);
    } else if (code >= PERSIAN_DIGIT_RANGE[0] && code <= PERSIAN_DIGIT_RANGE[1]) {
      out += String.fromCharCode(code - PERSIAN_DIGIT_RANGE[0] + 0x30);
    } else if (code === 0x066b) {
      out += ".";
    } else if (code === 0x066c) {
      // Arabic thousands separator → strip
      // (no append)
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Format a money amount: strip `.00` on whole numbers, keep 2 decimals
 * otherwise, group thousands. Locale-aware via toLocaleString.
 *
 *   fmtAmount(120)      // "120"
 *   fmtAmount(120.5)    // "120.50"
 *   fmtAmount(1240)     // "1,240"
 *   fmtAmount(1240.99)  // "1,240.99"
 */
export function fmtAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  const isWhole = rounded % 1 === 0;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

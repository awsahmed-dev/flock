"use server";

import { getDestinationHero } from "@/lib/unsplash";

/**
 * P6 — resolve hero images for the dashboard "Where to next" rail. The cards
 * render instantly with their gradient fallback; this fills in real photos
 * progressively so the dashboard never blocks on Unsplash. Cached 24h by
 * `getDestinationHero`'s fetch tags, so it's one network hit per destination
 * for the whole user base.
 */
export async function getDestinationImages(
  names: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    names.slice(0, 8).map(async (name) => {
      const hero = await getDestinationHero(name).catch(() => null);
      if (hero?.url) out[name] = hero.url;
    }),
  );
  return out;
}

"use client";

/**
 * DEV-ONLY a11y harness for the sweep's Task 4 (keyboard access). Mounts
 * the fixed Discover cards + a Tabs panel with mock data so axe-core can
 * audit real rendered DOM without auth/DB. Returns 404 in production.
 *
 * Usage (from the browser console or the sweep verifier):
 *   await window.__runAxe()   →  { critical, serious, violations }
 */

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { PlaceCard } from "@/components/discover/place-card";
import { PlaceCardCompact } from "@/components/discover/place-card-compact";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ScoredPlace } from "@/lib/discovery/score";

const mock = (id: string, name: string): ScoredPlace =>
  ({
    place: {
      placeId: id,
      provider: "google",
      name,
      category: "sight",
      placeTypes: ["tourist_attraction"],
      rating: 4.7,
      userRatingsTotal: 138021,
      priceLevel: null,
      coords: [139.7967, 35.7148],
      address: "Asakusa, Tokyo",
      photoRef: null,
      hoursSummary: null,
      topTip: "Go before 9am to beat the crowds.",
    },
    features: {} as ScoredPlace["features"],
    score: 0.9,
    popularityPercentile: 0.98,
    tags: [],
  }) as unknown as ScoredPlace;

export default function A11yHarness() {
  const [ready, setReady] = useState(false);
  if (process.env.NODE_ENV === "production") notFound();

  useEffect(() => {
    (async () => {
      const axe = (await import("axe-core")).default;
      (window as unknown as { __runAxe: () => Promise<unknown> }).__runAxe = async () => {
        const r = await axe.run(
          { include: [["#harness"]] },
          { rules: { "color-contrast": { enabled: false } } }, // Task 2 owns contrast; mock has no photos so scrim colours aren't representative
        );
        const bySev = (s: string) => r.violations.filter((v) => v.impact === s);
        return {
          critical: bySev("critical").length,
          serious: bySev("serious").length,
          violations: r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.length,
            targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
          })),
        };
      };
      setReady(true);
    })();
  }, []);

  const noop = () => {};
  const a = mock("p1", "Sensō-ji Temple");
  const b = mock("p2", "Meiji Jingu");

  return (
    <div id="harness" className="min-h-screen bg-background text-foreground p-6 space-y-8">
      <p className="text-xs font-bold text-amber-600">DEV A11Y HARNESS · {ready ? "axe ready — call window.__runAxe()" : "loading axe…"}</p>

      <section aria-label="immersive card">
        <div className="w-[320px] h-[420px]">
          <PlaceCard scored={a} center={null} saved={false} liked={false} likeCount={3} onOpen={noop} onSave={noop} onLike={noop} />
        </div>
      </section>

      <section aria-label="compact card">
        <div className="w-[320px]">
          <PlaceCardCompact scored={b} saved={false} added={false} onOpen={noop} onSave={noop} onHover={noop} />
        </div>
      </section>

      <section aria-label="tabs">
        <Tabs defaultValue="one" className="w-[320px]">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Panel one</TabsContent>
          <TabsContent value="two">Panel two</TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

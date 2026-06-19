# Paxawa v2 — Build Roadmap (phases & sprints)

**Status:** Active build plan. The execution spine for v2, reconciling the three logic docs into an
ordered, shippable sequence. Source-of-truth companions:
- `v2-discovery-planning.md` — what/why + Google architecture + cost model + roadmap §9.
- `v2-discovery-logic.md` — how it thinks (modes, learning §2, ranking §3, decisions §6, cross-app §13).
- `v2-discovery-build-spec.md` — exact mechanics (Part A signal engine, Part B decision card, Build order).
- `v2-design-system.md` — UI/UX canon, surfaces §4, component inventory §7, audit rubric §8.

**The bar (design §1):** what we have is *great*; v2 must be *perfect*. Two native designs (desktop +
mobile), real data/real proof always, no stitching. Every screen passes the 8-point rubric at both
fidelities before it ships.

---

## What we reuse vs. rebuild (honest inventory)

The Phase A/B work proved the plumbing. The **foundation libraries are the documented architecture and
stay** (hardened to spec). The **test UI surface deviated from the design system and gets rebuilt**.

| Keep & harden (this IS the spec) | Rebuild / retire (test scaffold) |
|---|---|
| `src/lib/places/*` — Google New client, cache, meter, features | `src/components/discover/discover-feed.tsx` (search-first → feed-first) |
| `src/app/api/discover/*` — server proxy routes | `src/components/discover/place-card.tsx` → canonical `PlaceCard` |
| `src/lib/discovery/*` — taste/score/rerank/ingest engine + tests | `src/components/discover/place-detail-panel.tsx` → canonical w/ carousel |
| `src/lib/discovery/client/*` — event queue, dwell, taste session | standalone `/trips/[id]/discover` route → folded into Plan IA |
| schema: `cached_places`, `place_events`, `taste_profiles`, `decisions`, google cols | the search-first IA, single-thumbnail cards |

The engine today is a **skeleton**; Phase 2 brings it to full build-spec Part A (complete event taxonomy,
honest dwell, scalar axes, rendered/upcoming buffers + exploration, cold-start seed, measurement).

**Discipline every sprint:** behind a feature flag · typecheck + lint + vitest green · desktop **and**
mobile screenshot · RTL + i18n (no hardcoded strings) · attribution where Google data shows · additive
to live testers (never regress the Plan page they use) · manual deploy (`npx vercel deploy --prod --yes`).

---

## Phase 1 — Foundation & the real bug-fix
*Goal: kill the dead-text bug on the **real** Plan page, on a cost-safe, flagged base. Ships value to
testers immediately. (planning §4, §5.4–5.6, §9.1; design §7)*

- **S1.1 — Ops hardening + feature flag.** Persist daily per-SKU spend; enforce the daily-cap
  kill-switch in the proxy (over cap → cached-only, never a live Google call); a `discovery` feature flag
  gating all v2 surfaces; `PoweredByGoogle` attribution component. *Done when:* a forced over-cap returns
  cached/empty (no spend), the flag hides/shows surfaces, spend is observable.
- **S1.2 — Canonical place primitives.** `RatingPill`, `PriceLevel`, `TagChip` (AI pick / gem / crew),
  `CategoryChips`, `SkeletonCard`, `EmptyState`, attribution — one canonical version each, desktop+mobile,
  RTL, i18n (design §7). *Done when:* each renders in isolation at both fidelities and passes the rubric.
- **S1.3 — Real Plan "Add place" → Google Autocomplete.** Replace free-text add with session-tokened
  autocomplete → Details (field-masked) → `itinerary_item` w/ `google_place_id` + coords + photo + rating
  → pin lands. Keep a rare "add manually" fallback. *Done when:* a place found via autocomplete pins on
  the real Plan map with full data; the trip bug is structurally impossible.

## Phase 2 — Signal engine + live re-rank (build-spec Part A)
*Goal: the "feels smart on day one" brain. Behind a flag; measure add-rate. (build-spec A1–A8, logic §2)*

- **S2.1 — Event taxonomy + capture.** All 14 events (A1) emitted, batched (~2s/meaningful action),
  each carrying the place feature vector. Honest dwell (A2): IntersectionObserver ≥60%, dominant card,
  scroll-pause ≥250ms, 2s/5s thresholds, 15s cap, idle guard, one-dwell-per-view.
- **S2.2 — Vector math to spec.** Session (LR≈0.20) + durable (LR≈0.03, confirmed-only) updates with the
  A3 signal strengths + asymmetry; the two scalar axes (A4) `popularity_pref` & `price_pref` as
  first-class dimensions; server persistence + decay.
- **S2.3 — Live re-rank + cold-start.** Rendered vs upcoming buffers (A5): debounced re-score of the
  unseen tail only, vector-biased refill, exploration injection (softmax/ε≈0.25, ~75/25). Cold-start
  blended seed (A6): diverse high-quality across Eat/See/Do, cached per destination, city-anchored
  (fixes the country-center bug).
- **S2.4 — Measurement + flag/AB.** Add-rate, time-to-first-add, feed-position-of-adds (A8); privacy
  hygiene (A7); learning-on/off flag for comparison.

## Phase 3 — Discover mode, done right (planning §3, design §4.1/4.2/4.4)
*Goal: the real Discover experience — feed-first, integrated into Plan, canonical cards + carousel.
Replaces the test scaffold.*

- **S3.1 — Canonical `PlaceCard` + `PlaceDetailPanel`.** Card: 16:10 hero, rating+reviews, price,
  category, distance, tags, one-tap Add/Suggest, hover→pin pulse. Detail: **photo carousel (5–10
  images)**, top reviews, hours, address, Maps link, accordion Add-to-day, attribution. Desktop
  slide-over / mobile full sheet.
- **S3.2 — Feed-first Discover surface.** Opens on the cold-start seed (never empty); category chips are
  **filters** over the live feed (All default); search **demoted** to explicit-intent; live re-rank
  visible ("getting warmer"). Consumes the Phase 2 engine.
- **S3.3 — Fold into Plan IA (`Days | Discover`).** One canvas sharing the Mapbox map + state;
  hover↔pin sync; nav. Retire the standalone `/discover` route + test components.

## Phase 4 — Chat decisions (build-spec Part B, logic §6)
*Goal: the decision card replaces the Votes page.*

- **S4.1 — Create + open card.** `decisions` lifecycle; owner "Add to day" vs "Ask the crew"; member
  "Suggest"; rich decision card in chat (open state) + notify all.
- **S4.2 — Vote + resolve.** Inline 👍/👎, changeable; quorum (`yes>no AND yes≥ceil(members/2)`); close
  triggers; tie-break (owner→default skip); no-quorum; passed → lands on day/Unscheduled tray.
- **S4.3 — Decisions lens + notifications + edges.** Retired Votes tab → "Open (needs your vote)"
  filter + nav badge; bell triggers; edge cases (proposer leaves, place closed, dupes, solo trip).

## Phase 5 — AI curation (planning §3.5, §9.3)
"✨ Plan this day" real-place sequence assembly; AI Plan wizard outputs addable cards; richer AI-pick
tagging grounded in trip vibe + real results.

## Phase 6 — Spread the pattern (planning §9.4, logic §13)
Expenses (suggested split / shared-meal) · Bookings (richer real hotel cards, taste warm-start) ·
Dashboard ("trips you'd love") · **offline cache** of an added itinerary's place data (spotty signal).

---

## Sequencing rationale
The build-spec leads with the engine; the planning doc leads with the autocomplete bug-fix. We take the
**bug-fix-first** ordering: Phase 1 delivers value to current testers and de-risks cost/ops **without**
depending on the engine, then Phase 2 builds the brain, then Phase 3 makes Discover the real experience
that consumes it. Phases 1–3 are the spine; 4 adds the social layer; 5–6 are the multiplier.

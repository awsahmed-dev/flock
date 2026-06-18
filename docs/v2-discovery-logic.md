# Paxawa v2 — Core Logic & Flow Redesign

**Status:** Planning / spec. No code yet. Companion to `v2-discovery-planning.md` (the what/why).
This doc is the **how it thinks** — the engine, the algorithms, the data lifecycle, the state machine.

The goal: not a search box bolted onto the old flow. A redesigned loop where **discovery, the
crew's taste, the plan, the money, and the memory are one connected system.**

---

## 0. The new mental model — one loop

```
   ┌──────────────────────────────────────────────────────────┐
   │                     TRIP TASTE PROFILE                     │
   │   (what THIS crew wants — explicit + behavior + budget)    │
   └──────────────┬───────────────────────────▲────────────────┘
                  │ ranks                       │ learns from
                  ▼                             │
        DISCOVER ──► SHORTLIST ──► VOTE ──► PLAN ──► SPEND ──► REMEMBER
        (real         (crew         (decide  (day +   (link     (archive,
         places)       maybes)       together) pin)   expense)   feeds next trip)
```

Every arrow is a logic system below. The taste profile sits in the middle — it ranks discovery
AND learns from every action the crew takes. That feedback loop is what makes the app feel smart
instead of generic.

---

## 1. Information architecture (the Plan page is reborn)

The map is always present. The left panel (desktop) / bottom surface (mobile) has **two modes**
via a top segmented control:

| Mode | Shows | Map shows |
|---|---|---|
| **Days** | Your committed itinerary, by day | Plan pins + day routes |
| **Discover** | Search + browse real places | Result pins, live |

This replaces today's single day-list. Discover is not a modal bolted on — it's a first-class
mode with equal standing to your itinerary.

**No separate Shortlist board.** A discovered place either goes **straight into a day** (owner) or
becomes a **decision card posted into the trip chat** (anyone). "Maybes" live as open decisions in
the conversation, not on a third board — see §6. The old standalone **Votes page is retired**; it
becomes a thin **"Decisions" filter** over the chat (open + resolved) so nothing gets lost in scroll.

---

## 2. The Trip Taste Profile (the brain)

A structured, evolving model of what this specific crew wants. It is the single input to every
ranking decision in the app.

**Core principle (decided): the engine learns IN-SESSION, TikTok-style — it does NOT need
historical data to feel smart.** A brand-new user who just picked a country and opened Discover
gets a feed that personalizes within *minutes* of browsing, the same way TikTok's For You page
warms up after a few videos. Cross-trip history is a bonus that makes returning users instant, not
a prerequisite.

### 2.1 Two timescales (the key structure)
The profile is **two vectors running at different speeds:**

- **Session vector — fast, volatile.** Seeds from the questionnaire prior (or neutral if skipped).
  Updates within *seconds* of micro-interactions while browsing. Drives the **live re-ranking** of
  the current Discover feed. This is what makes a first-time user feel understood with zero history.
- **Durable vector — slow, persistent.** The cross-session / cross-trip preference. Updated at a
  *low* learning rate, and only from **confirmed** actions (add, vote, payment). Survives between
  trips; warms the cold-start of the next one.

The session vector makes the *first* session feel personal. The durable vector makes *every later*
session feel instant.

### 2.2 Micro-signal taxonomy (the For-You loop)
Every browse interaction is a signal. **Positive signals are trusted more than negative ones** —
a fast scroll-past is noisy (they might be skimming to the bottom), a dwell or open is reliable.

| Signal | Reads as | Weight |
|---|---|---|
| Card dwell ≥ 2s (in viewport, scroll stopped) | mild interest — the "learning phase" | **+small** |
| Card dwell ≥ 5s | real interest | **+medium** |
| Tap → open detail | strong interest | **+strong** |
| Detail dwell (reading reviews/photos) | strong interest | **+strong**, scales with time |
| Save / shortlist | commitment | **+big** |
| Add to day | commitment | **+strong** |
| Log an expense there | revealed preference — they *paid* | **+strongest** |
| Scroll past fast (<1s in viewport) | maybe not interested | **−tiny** (noisy, low trust) |
| Open then immediate back | "looked, nope" | **−medium** |
| Remove / 👎 | explicit no | **−strong** |

A single weak signal nudges gently; the engine trusts **escalating** sequences (dwell → open →
add) far more than isolated taps. One accidental stop won't hijack the feed.

### 2.3 What gets learned (richer than "likes Chinese")
Each signal updates **several axes at once**, not just category:
- **Category / cuisine** — Chinese, ramen, cafés, museums, hikes…
- **Niche ↔ famous** — *do they stop on low-review-count gems or high-review landmarks?* (This is
  the exact axis you named — "looking for niche things, not the regular famous places.") Captured
  explicitly so the engine learns *taste in discovery style*, not just topic.
- **Atmosphere** — cozy ↔ lively, upscale ↔ casual.
- **Price level** — do they dwell on $ or $$$ cards?

So when a user stops 5s on a niche cafe, the engine learns "likes cafés" **and** "prefers
low-review-count hidden spots" **and** "casual / $$" — a much sharper signal than topic alone.

### 2.4 Live re-ranking + exploration (avoiding the echo chamber)
The Discover feed is **not a fixed list** — it's a stream that re-sorts as signals arrive:
1. After each meaningful signal, the session vector updates.
2. The *not-yet-seen* portion re-scores against the new vector and re-orders.
3. New candidates matching the sharpening profile are pulled in (after two Chinese stops → blend in
   more Asian options).
4. **Exploration vs exploitation (critical):** ~70–80% of the feed reflects learned preference,
   ~20–30% stays diverse/exploratory (softmax / ε-greedy). This is exactly how TikTok avoids
   showing *only* dance videos after one — it keeps injecting variety so you keep discovering and
   the engine keeps learning new axes. Without this, "saw one Chinese → now it's ALL Chinese" would
   feel broken.

### 2.5 Cold-start sequence (the first session, zero history)
1. Pick country/trip → light (optional) questionnaire sets a prior.
2. Land in Discover on a **diverse, high-quality seed feed** — top-rated across Eat/See/Do for the
   destination, famous + a few gems. Even with zero signal the first screen is genuinely good.
3. Browsing sharpens the session vector; by ~5–10 interactions the feed visibly personalizes — the
   "it gets me" moment.
4. Confirmed actions promote into the durable vector for next time.

### 2.6 Group dimension
Each member's browsing feeds **(a)** their *personal* session vector (their "rank for me" cut) and
**(b)** the *crew* vector at reduced weight. The shared feed reflects the group; each person's own
browsing tunes their personal view. Conflicts still surface as votes (§6).

### 2.7 Structure, decay, guards
- **Soft-preference vector:** weighted tags over category/cuisine/atmosphere/price/niche axes.
- **Hard-constraint set:** halal/veg, wheelchair, budget ceiling, "no temples" — these *filter*,
  never *score*.
- **Decay:** session weights decay fast (per session); durable weights decay slowly across trips.
- **Noise + privacy guards:** debounce signals; trust escalation over isolated taps; a subtle
  "personalized for your crew" label (transparent, never creepy); learning is over place
  *categories/axes*, not personal data — nothing sold, nothing shared.

### 2.8 Where it's used
Discovery ranking + live re-ranking, "Plan this day," AI picks, budget warnings, hotel suggestions
(dwell on hotel cards learns price/style), and — long term — "trips you'd like" on the dashboard.

---

## 3. The Discovery Engine

Two entry modes → one ranking pipeline → a curated, tagged, diversified result set.

### 3.1 Candidate generation
- **Search (intent):** free text → Google **Text Search** → candidates.
- **Browse (exploration):** category chip + reference point → Google **Nearby Search** → candidates.

Reference point precedence: active day's existing pin cluster → trip hotel → map center.

### 3.2 The ranking pipeline (runs server-side on candidates)

**Step 1 — Filter (hard constraints).** Drop anything failing: closed during trip dates, wrong
dietary, inaccessible, outside the distance radius, hard "no" categories.

**Step 2 — Score (composite).**
```
score(p) = w_q·quality(p) + w_t·tasteFit(p) + w_x·proximity(p) + w_c·crewSignal(p) − penalties(p)

quality(p)    = norm(rating) · saturate(log10(reviewCount))     // 4.6×2000 reviews > 4.9×8
tasteFit(p)   = cosine(p.tagVector, profile.softVector)          // 0..1
proximity(p)  = 1 / (1 + km(p, ref) / scaleKm)                   // decays with distance
crewSignal(p) = saved(+) · voted(+) · reacted👍(+)
penalties(p)  = alreadyAdded(−−) · rejected(−−−) · overBudgetSoft(−)
```
Weights shift by mode: **Browse** leans proximity; **Search** (explicit intent) leans quality+taste,
relaxes proximity.

**Step 3 — Tag (the "AI" the user sees).**
- `✨ AI pick` — top-N by score.
- `Hidden gem` — rating ≥ 4.5 AND review count below the category-area median (great, not yet crowded).
- `Crew favorite` — has crew votes/saves.
- `Great for {interest}` — strong match to a specific stated interest.

**Step 4 — Diversify (MMR re-rank).** Don't return 10 ramen shops. Iteratively pick the
highest-scoring item that's *dissimilar* (cuisine/category) from those already chosen, so the top
of the list reads as a curated spread, not a repeat.

Output: a ranked, tagged, de-duplicated list. **The AI invented nothing — it filtered, scored,
tagged, and diversified real Google results.** That's "AI as curator" made concrete and honest.

---

## 4. "Plan this day" — sequence assembly (the killer feature)

Replaces "AI writes a paragraph." Input: a day, the taste profile, the day's existing items, the
hotel, the flight boundaries. Output: an ordered sequence of **real, addable, pinned** places with
a route drawn on the map.

**Step 1 — Slot template** by pace:
- *Chill:* breakfast · 1 anchor sight · lunch · free · dinner
- *Packed:* breakfast · sight · sight · lunch · sight · coffee · dinner · (nightlife)

**Step 2 — Fill slots** with scored candidates per slot category (breakfast→cafés, anchor→top sights…).

**Step 3 — Geographic optimization.** Choose the combination minimizing total travel
(greedy nearest-neighbor / mini-TSP), anchored on the hotel or the must-see sight, so the day
doesn't zig-zag the city.

**Step 4 — Time assignment** using dwell + travel:
```
dwell: breakfast 60 · coffee 45 · lunch 75 · dinner 90 · landmark 60 · museum/sight 120 · activity 150 · nightlife 120  (minutes)
start(slot) = max(dayStart, end(prevSlot) + travelTime(prev, this))
end(slot)   = start + dwell(category)
```
Respect **flight boundaries**: no 9am breakfast on a day you land at noon; no late dinner before a
red-eye.

**Step 5 — Present** as ordered cards + a route polyline. User can: **accept all**, **swap one**
("show alternatives for lunch" → re-query that slot only), or **remove**. Every item is real and
pinned.

---

## 5. The Place lifecycle & data model

A place travels through clear states; the data model mirrors the journey.

```
DISCOVERED ── ephemeral Google result, minimal fields, never stored long
   │
   ├── owner: "Add to day" ─────────────────────────────► PLANNED
   │
   └── anyone: "Ask the crew" / "Suggest" ──► PROPOSED (decision card in chat)
                                                 │  yes wins → PLANNED
                                                 │  no  wins → REJECTED (stays in chat as a record)
PLANNED    ── itinerary item: day + time + pin + snapshot
   │ log expense here (place_id or manual match)
PAID       ── linked to an expense row
   │ trip ends
REMEMBERED ── past-trip archive; feeds taste profile for future trips
```

### 5.1 Tables / fields
- **`cached_places`** (shared, the cost saver): `place_id` PK · `snapshot` jsonb · `fetched_at` · `ttl`.
  Everyone planning Penang hits the same restaurants → cache once, serve many.
- **`itinerary_items`** (extend current): `google_place_id` · `provider` · `price_level` ·
  `rating` · `user_ratings_total` · `place_types[]` · `address` · `photo_ref` + cached URL ·
  `day_date` · `start_time` · `dwell_min` · `sort_order` · `status`.
- **`decisions`** (new): trip_id · place_id · snapshot · proposed_by · proposed_day (optional) ·
  chat_message_id · status (open/passed/failed) · votes (per-member yes/no) · closes_at.
- **Expense link:** expense row gets optional `place_id` to bind spend → planned place.

### 5.2 Freshness
Snapshot TTL ~30 days. On access, if stale: serve cache immediately, re-fetch in background, update.
`place_id` kept forever (allowed). Photos cached short-term, never permanently rehosted (Google policy).

---

## 6. Crew collaboration — decisions happen in the chat (Votes page retired)

The standalone Votes page was the deadest surface — out of context, people didn't know what to
vote on. v2 dissolves it: **decisions are rich cards in the trip chat**, where the conversation and
the context already live. The chat stops being "just chatting" and becomes the trip's decision log.

### 6.1 Who can do what
- **Owner**, from a discovered place → two actions:
  - **"Add to day"** — commits it directly (owner's prerogative).
  - **"Ask the crew"** — posts a decision card to chat (when they want buy-in).
- **Member**, from a discovered place → one action:
  - **"Suggest"** — posts a decision card to chat. Members can't unilaterally commit; they propose.

### 6.2 The decision card (the new "vote")
When someone suggests/asks, a **rich card posts into the chat stream**:
- The place: **photo · name · rating · price · category**, + an optional one-line note from the
  proposer ("this looked amazing on the food tour") and an optional **proposed day** ("for Day 2?").
- Inline **👍 / 👎** with a live tally ("3 yes · 1 no · 1 pending").
- **All members get notified** (existing notification system + bell): *"Aws suggested Kheng Hoe
  Chicken Rice — what do you think?"*
- Members vote **right on the card, in the chat** — no detour to another page. They see exactly
  what they're deciding on (image + name + rating), which kills the "I don't know what to vote for"
  problem.

### 6.3 Resolution
A decision closes when: everyone has voted, a deadline (`closes_at`) passes, or the owner closes it.
- **Passes (majority yes):** the place **auto-commits to a day** (the proposed day if one was set,
  else the owner slots it). The card updates to "✅ Added to Day 2."
- **Fails (majority no):** the place is **not** added. The card updates in place with a
  generated summary — *"3 of 5 said skip — left out of the plan"* — and stays in chat as a record.
  Nothing pollutes the itinerary.

### 6.4 The "Decisions" filter (findability without a dead tab)
Creation + interaction happen in chat. But open decisions shouldn't get buried in scroll, so the
retired Votes tab becomes a thin **Decisions inbox**: a filtered view of decision cards (open
pinned to top, resolved below). It's a *lens on the chat*, not a separate destination. "What still
needs the crew's input" at a glance.

### 6.5 "Rank for me" toggle
Discovery results are ranked for the *group* by default; a member can flip to their personal cut
(their session vector) to see what *they'd* pick — then suggest it to the crew.

So no single person silently dictates the trip, and the decisions live where the talking already is.

---

## 7. Budget-aware discovery (Plan ↔ Expenses, fused)

- Discovery can **filter/sort by price level**; a **"within budget" toggle** computes a per-day
  ceiling = remaining budget ÷ remaining days and flags places that'd blow it (soft penalty in score).
- When an expense is logged, attempt to **bind it to a planned place** (place_id match, else
  manual). The plan then shows "✓ paid SAR X here," and that becomes the **strongest** positive
  taste signal (revealed preference).
- Result: the budget you already track *steers what gets recommended*, and what you actually do
  *teaches the recommender*. The two stop being separate tabs.

---

## 8. Bookings ↔ Plan linkage

- **Hotel = anchor.** Its location is the default reference point for "near me" discovery and the
  start/end anchor for "Plan this day."
- **Flights = day boundaries.** Arrival/departure times constrain the first/last day's slots.
- A booked hotel/flight also seeds discovery context (you're in *this* neighborhood these nights).

---

## 9. Offline + sync (it has to work ON the trip)

- On opening a trip: prefetch + cache all **committed** items' snapshots + photos locally
  (IndexedDB / service-worker), plus a Mapbox offline region for the destination.
- **Committed plan = fully offline:** map, pins, times, addresses, item details all work with no signal.
- **Discovery = online** (it's live Google), degrades gracefully to "you're offline — here's your plan."
- Offline mutations (reorder, check off, log expense) queue and sync optimistically on reconnect.

This is non-negotiable given the trip pain point — spotty signal is the *normal* travel condition.

---

## 10. Cost-control architecture (system view — the all-in-Google risk)

- **All Google calls via a server route** (`/api/places/*`). Key never client-side.
- **Three-layer cache:** in-memory LRU (per-instance, hot) → `cached_places` (Postgres, shared,
  TTL) → Google (cold). Most lookups never reach Google.
- **Session tokens** threaded autocomplete → details (billed as one session).
- **Field-mask profiles** per surface: `LIST_MASK` (cheap: id, name, location, rating, 1 photo) vs
  `DETAIL_MASK` (richer, only on card open). Never pull review-content fields on a list.
- **Quotas:** per-user rate limit + **global daily spend cap with a kill-switch** that degrades to
  cache-only when tripped.
- **Photos** proxied + short-cached; never permanently rehosted. **"Powered by Google"** + photo/
  review attributions designed into the components.

---

## 11. The AI wizard's new role

The creation questionnaire stays, but its job changes:
1. It **seeds the taste profile** (explicit signals).
2. It triggers a first **"Plan this day" pass across all days** → a real starter itinerary of real,
   pinned places the crew then edits via discovery.

It is the **on-ramp to the discovery engine**, not a separate text generator. There is no longer a
code path that produces place names from a language model alone.

---

## 12. Migration (existing trips don't break)

Existing itinerary items are free text, some with geocoded lat/lng. On v2, a **background,
non-destructive** pass tries to resolve each to a `google_place_id` via Text Search:
- match found → upgrade the item with place_id + photo + rating + price (now a real card on the map).
- no confident match → keep as a `provider:'manual'` item (still pinned if it had coords).

Nothing is deleted; trips only get richer.

---

## 13. The smart-suggestion thread across the whole app

One brain (the taste profile, §2) feeds every surface. The same loop — *real data + learned taste
+ human stays in control* — repeats everywhere. This is what makes v2 a coherent system instead of
a planning feature with extras.

### 13.1 Bookings (hotels + flights)
- **Hotel discovery mirrors place discovery.** Real hotel cards with the same **micro-signal
  learning** — dwell on a $$$ boutique vs a $ hostel teaches price/style and re-ranks results live.
- **Cross-surface warm-start.** The price + atmosphere + niche↔famous axes learned from browsing
  *places* pre-rank *hotels*. Someone who lingered on niche cafés and $$ restaurants sees boutique /
  mid-range stays first — without rating a single hotel. The brain transfers.
- **Hotel = anchor** for place discovery; **flights = day boundaries** (§8).

### 13.2 Dashboard (long game — destination inspiration)
- The **durable vector across all the user's trips** powers "destinations you'd love" + trip ideas
  on the dashboard. Adventure/nature/niche history → Georgia, Patagonia, Hokkaido surfaced — not a
  generic mall-city list. The more they travel with Paxawa, the better it knows their *travel
  identity*. This is the retention flywheel.

### 13.3 Expenses
- **Feeds the brain the strongest signal** (paid here = revealed preference) and **consumes it**
  for smart defaults (predict category + split). Budget-aware discovery (§7) closes the loop:
  spend steers recommendations, recommendations shape spend.

### 13.4 Chat (now the decision hub, §6)
- Beyond decisions: the AI already watches chat for actionable mentions ("we should hit X") → it
  can surface a **real place decision card** right there. Chat becomes where talk turns into plan.

### 13.5 Packing / Docs
- Lighter touch, same philosophy: **smart defaults from real context** — beach destination →
  swimwear; cold + hiking vibe → layers + boots; visa-required country → passport/visa doc nudges.
  Not feed-learning, but "smart suggestion grounded in real context," consistent with everything else.

**The unifying principle:** every surface offers smart suggestions grounded in real data + the
crew's learned taste, and the human always stays in control. One brain, many surfaces.

---

## 14. What this buys us (why it's a moat, not a feature)

- **Trust:** every suggestion is a real place with proof. No hallucinated restaurants.
- **Personal from minute one:** in-session learning makes a first-time user's feed feel personal
  within minutes — no data required (§2).
- **Connected:** discover → decide-in-chat → plan → spend → remember is one object lifecycle, not
  six disconnected tabs. The data compounds — every trip makes the next one smarter.
- **Defensible:** anyone can wrap an LLM and print an itinerary. The in-session taste loop + the
  chat-embedded decision layer + the spend-linked learning is the part competitors can't copy by
  prompting better.
```

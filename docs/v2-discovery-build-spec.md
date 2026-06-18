# Paxawa v2 — Build Spec (implementation-grade)

**Status:** Planning / spec. No code yet. Third doc in the v2 set — the *exact mechanics* of the
two things we build first. Companions: `v2-discovery-planning.md` (what/why), `v2-discovery-logic.md`
(how it thinks).

- **Part A — In-session signal engine + live re-rank.** The foundation. The "feels smart on day
  one" promise rests entirely on this, so it's built first.
- **Part B — The decision card.** The chat-embedded vote that replaces the Votes page.

All numbers below are **starting points to tune**, not gospel. They're written down so we have a
concrete baseline to measure against.

---

# PART A — In-session signal engine

## A1. Event taxonomy (what we capture)
Every browse interaction emits a typed event, batched client→server (~every 2s or on meaningful
action). Each event carries the place's **feature vector** (its category / cuisine / atmosphere /
price / popularity tags) so the server updates the taste vector without re-fetching the place.

| Event | Trigger | Key payload |
|---|---|---|
| `card_impression` | card enters viewport (≥60% visible) | place_id, feed_position, ts |
| `card_dwell` | dominant card, scroll paused ≥ threshold | place_id, dwell_ms, position |
| `card_exit` | card leaves viewport | place_id, total_dwell_ms |
| `card_open` | tap → detail | place_id, source (feed/pin/chat) |
| `detail_dwell` | time in detail view | place_id, dwell_ms, scrolled_reviews, photos_viewed |
| `detail_close` | leave detail | place_id, total_ms, action_taken |
| `place_add` | added to a day | place_id, day |
| `place_suggest` | suggested to crew (decision created) | place_id |
| `place_remove` | removed from day | place_id |
| `decision_vote` | 👍/👎 on a decision card | decision_id, place_id, vote |
| `expense_at_place` | expense bound to a place | place_id, amount |
| `search_query` | text search issued | query_text |
| `category_filter` | category chip tapped | category |
| `map_pin_click` | clicked a result pin | place_id |

## A2. Dwell measurement (the precise mechanics)
The subtle part — "stopped on a card 2–5s" has to be measured honestly.

- **In view** = IntersectionObserver, card ≥60% visible.
- **Dominant card** = the in-view card closest to viewport center (the one they're actually looking at).
- **Scroll paused** = no scroll event for ≥250 ms while a card is dominant → start its dwell timer.
- **Thresholds:** dwell ≥ **2000 ms** → weak positive ("learning phase"); ≥ **5000 ms** → medium
  positive. Credit **capped at 15 s** (beyond that it's probably idle, not interest).
- **Idle guard:** on tab blur / window unfocus / no interaction for 20 s → **freeze all dwell
  timers.** Never credit a card because the phone was left open on the table.
- **One dwell per view session** (enter→leave). Scrolling back to a card = a *new* view = a small
  re-engagement bonus.

## A3. Signal → vector update (the math)
Two vectors over feature dimensions (sparse tag weights). Each place has a normalized feature
vector. On a signal of strength `s` for place `p`:

```
session_vector += LR_session · s · normalize(p.features)     // positive
session_vector -= LR_session · |s| · normalize(p.features)   // negative
clip / L2-normalize session_vector after each update
```

- **LR_session ≈ 0.20** (fast — adapts within a handful of signals).
- **Durable vector** updates only from **confirmed** events (add, suggest-passed, vote, expense,
  remove) at **LR_durable ≈ 0.03**, and decays slowly across trips.

**Starting signal strengths (tune later):**

| Signal | s |
|---|---|
| dwell 2 s | +0.20 |
| dwell 5 s | +0.50 |
| card_open | +0.70 |
| detail_dwell (per 5 s, cap +1.0) | +0.30 |
| place_add | +1.50 |
| place_suggest | +1.20 |
| decision_vote yes / no | +0.80 / −0.80 |
| expense_at_place | **+2.00** (strongest) |
| fast scroll-past (<1 s) | −0.05 (noisy, low trust) |
| open → back <2 s | −0.50 |
| place_remove | −1.50 |

**Asymmetry rule:** positives are trusted more than negatives. A fast scroll-past barely moves the
needle; the engine trusts **escalation** (dwell → open → add) far more than isolated taps.

## A4. Two explicit scalar axes (don't bury them in tags)
Beyond category tags, model two preferences as standalone scalars because they're *discovery
style*, not topic:

- **`popularity_pref` (niche ↔ famous):** each place has a `popularity_percentile` = its review
  count vs the category-area distribution. Engaging low-percentile places pushes `popularity_pref`
  toward niche; high-percentile toward famous. Ranking then **shapes the feed's popularity mix** to
  match — a niche-leaner gets more sub-10k-review gems blended in.
- **`price_pref` ($ ↔ $$$$):** same idea over price level.

This is the axis the user named ("looking for niche, not the famous places") — captured as a
first-class dimension, not inferred.

## A5. Live re-rank (when + how it fires)
The feed is a stream with two buffers:

- **rendered** (seen / on screen) — never reshuffled under the user (jarring).
- **upcoming** (queued, unseen) — this is what re-orders.

Mechanics:
1. After each meaningful signal (debounced ~500 ms to batch rapid events), **re-score the upcoming
   buffer** against the current session vector and re-order it. The tail changes; the user's
   current view doesn't yank.
2. **Refill:** when upcoming < 8 cards, fetch more candidates. The fetch query is **biased by the
   current session vector** (two Chinese stops → next Nearby/Text query weights Asian categories) —
   always with the exploration quota mixed in.
3. **Exploration injection (anti-echo-chamber):** every batch of ~5 cards, force-insert 1–2
   high-quality but *dissimilar* cards. Implemented as **softmax sampling over scores** (temperature
   τ) or ε-greedy (ε ≈ 0.25): ~75% exploit learned taste, ~25% explore. This is how the feed avoids
   "saw one Chinese → now all Chinese."
4. **Feel:** "getting warmer," not "list teleported." Smooth transitions; never reorder a card mid-read.

## A6. Cold-start seed
First feed, zero signals: a **diverse, high-quality destination seed** — top-rated across
Eat / See / Do, famous anchors + a couple of gems, capped per category so nothing dominates. Uses
the questionnaire prior if present. **Cacheable per destination** (shared across users) → cheap.

## A7. Privacy & hygiene
- Events are about place *features* + trip membership, not personal identity.
- Dwell/scroll telemetry stays server-side, ranking-only; never sold or exposed.
- Subtle "personalized for your crew" label + a "not interested / reset" control → transparent and
  controllable.
- Keep **raw events short-term** (model tuning), then aggregate; persist the vectors, drop granular
  logs after a window.

## A8. How we know it's working (measurement)
- **Add-rate** (places added per session) and **time-to-first-add** — should improve with learning on.
- **Feed position of added places** — as a session learns, adds should come from higher up.
- **A/B:** learning-on vs learning-off → add-rate, session length, adds/session. Ship behind a flag.

---

# PART B — The decision card

The chat-embedded vote (replaces the Votes page). Full UX + lifecycle.

## B1. Creating a decision
- **Trigger:** owner **"Ask the crew"** or member **"Suggest"**, from a place in Discover, a map
  pin, or the detail view.
- **Composer (lightweight):** optional note ("looked amazing on the food tour"), optional **proposed
  day** (chips: Day 1…N or "Any day"), optional **closes-in** (default **24 h**; options 6 h / 48 h /
  no deadline).
- Posts a **decision card as a chat message** + creates a `decisions` row + **notifies all members.**

## B2. Card states
| State | Shows |
|---|---|
| **Open** | place info · 👍/👎 · live tally · countdown ("closes in 18h") · proposed day · who's pending |
| **Passed** | "✅ Added to Day 2" · final tally · link to the itinerary item |
| **Failed** | "Skipped — 3 of 5 said no" · final tally · stays as record |
| **No-quorum** | deadline hit, too few votes → owner prompted (extend / decide / auto-skip) |
| **Cancelled** | proposer/owner withdrew |

## B3. Voting rules
- One vote per member, **changeable until close** (tap again to switch/retract).
- **Proposer auto-votes yes** when they "Suggest." Owner "Ask the crew" = owner **neutral** (they're
  asking, not endorsing).
- Live tally visible to all; pending members named ("waiting on Sara, Adam").

## B4. Resolution logic (precise rules — the part that's easy to get wrong)
**Quorum (so 1 stray yes can't commit a place the group ignored):**
> Passes if **`yes > no` AND `yes ≥ ceil(memberCount / 2)`** (a real majority of the whole crew),
> or owner force-passes.

**Close triggers:**
1. **Everyone voted** → resolve immediately.
2. **Clear majority reached early** (`yes ≥ ceil(memberCount/2)`) → optional **auto-pass before
   deadline** so an obvious yes doesn't wait 24 h.
3. **Deadline reached** → resolve with current votes + quorum rule.
4. **Owner manual close** → owner can close early and **override** (force-add or force-skip — it's
   their trip).

**Tie-break (`yes == no` at close):** **owner decides** (prompt: "It's tied — add or skip?"). If the
owner doesn't act within a grace window → **default skip** (contested places stay out; itinerary
stays clean).

**No-quorum at deadline:** prompt owner to **extend / decide manually / auto-skip**; default
auto-skip after grace.

## B5. After it passes — which day, what time?
- **Proposed day set** → lands on that day; time auto-assigned via the §4 dwell+travel logic
  (slotted sensibly among existing items).
- **"Any day"** → goes to an **Unscheduled tray** for the trip; owner drags it onto a day, **or** AI
  suggests the best day/slot from category + existing plan + geography.
- Card updates: "Added to Day 2, 3:00 PM."

## B6. Re-open / change-my-mind
- A **failed** decision can be **re-proposed** by anyone → a *new* card + fresh vote. The old card
  stays as history (never mutate a closed decision).
- A **passed** place on a day can be **removed** like any item (plan edit, not a re-vote). If removed,
  its card shows "later removed from plan" for honesty.

## B7. Notifications (reuse existing bell/notification system)
- **Create:** "Aws suggested X — vote."
- **Pending + deadline near:** "3 h left to vote on X."
- **Resolve:** "X passed — added to Day 2" / "X was skipped."

## B8. The "Decisions" lens (the retired Votes tab)
A filtered view: **Open (needs your vote)** pinned top, **Recently resolved** below. Tap → jumps to
the card in chat. **Nav badge = decisions awaiting *your* vote** — a clear count that drives
participation and fixes the "people don't vote" problem.

## B9. Edge cases
- **Proposer leaves the trip** → decision stays; owner can close.
- **Place permanently closed** (per Google) while open → flag on card, allow skip.
- **Duplicate suggestion** → dedupe: second attaches to the existing open decision, or warns
  "already being decided."
- **Solo trip (1 member)** → no decisions; "Ask the crew" hidden; everything is direct-add.

---

# Build order
1. **A (signal engine + re-rank)** — the foundation everything else learns from. Build behind a flag,
   measure add-rate.
2. **Discover feed UI** consuming A.
3. **B (decision card)** once Discover can produce a place to suggest.
4. Then the cross-app thread (`v2-discovery-logic.md` §13).

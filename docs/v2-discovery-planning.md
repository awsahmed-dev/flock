# Paxawa v2 — Discovery-First Planning

**Status:** Planning / spec. No code yet.
**Decided:** Data layer = **all-in Google Places (New)**. Map canvas stays **Mapbox GL**.
**Origin:** Real-trip audit (Langkawi/Penang). Expenses felt strong; AI planner felt weak
because it produced places with no proof and no way to act on them. The user found places
on TikTok, tried to add them, the search bar couldn't find them, so they became dead text
with no map pin — which breaks the map-first promise the whole app is built on.

---

## 1. The product reframe

**Old model:** AI is the *author*. "Write me a plan" → a paragraph of place names with no
photo, rating, review, or pin. Commoditized, low-trust, un-actionable.

**New model:** AI is the *scout + curator*. It never invents a place name. It surfaces
**real, verifiable places** (Google data: photo, rating, reviews, price, hours, coordinates)
and its only job is to **rank and tag** among them — "Suggested for your crew," "Hidden gem,"
"Everyone's going here." The human stays in control: they see the photos and reviews and decide.

Three principles:

1. **Every place is real and addable.** No dead text. Anything that appears can be added to a
   day, and when added it lands on the map with its pin, photo, and rating already attached.
2. **AI grounds, never hallucinates.** AI re-ranks and tags real Google results. It can also
   *assemble* a day from real places (breakfast → sight → lunch → …), but every item is a real
   place with a pin.
3. **Smart suggestions everywhere, control everywhere.** The "suggested on real data" pattern
   spreads from Plan into Expenses and Bookings. The narrative: *smart suggestions on real
   data, everywhere — you stay in control.*

What we are NOT doing: integrating TikTok (no clean API for place-tagged video). We replicate
the *feeling* — real photos + social proof — via Google photos/reviews, and later crew-attached
photos/clips.

---

## 2. What stays / changes / dies

| Surface | Decision |
|---|---|
| **Expenses** | **Keep as-is.** It works and users trust it. Don't touch the core; only add light "suggested split / shared-meal" smarts later. |
| **Plan / itinerary** | **The rebuild.** Free-text "Add place" dies. Replaced by Google-backed search + a Discover/Explore mode. This is ~90% of the work and 100% of the payoff. |
| **AI Plan wizard** | **Reframed, not removed.** Same questionnaire; output changes from a text wall to *real addable place cards* assembled across days. |
| **Bookings** | Keep the flow; later upgrade hotel rows to richer real cards. |
| **Map** | **Keep Mapbox** for the branded, custom-styled canvas. |
| **Add-place free text** | **Dies** as the default. Survives only as a rare "can't find it? add manually" fallback. |

---

## 3. The core experience: Discover mode

### 3.1 Entry
- **Desktop:** a search bar pinned at the top of the Plan left panel + category chips.
- **Mobile:** a search affordance that opens a full-screen discover sheet.

### 3.2 Search + browse
- Free text: *"ramen near Asakusa," "good coffee," "rooftop bar."*
- Category chips for zero-typing browse: **Eat · Coffee · Sights · Nightlife · Shopping · Activities.**
- Reference point for "near me / distance": the trip's hotel, or the active day's existing
  cluster of pins, or the map's current center.

### 3.3 Results (the Google-results feeling the user described)
- **Desktop:** card grid in the left panel + synchronized pins on the Mapbox map.
- **Mobile:** card list with a map peek; tap a card to expand.
- **Each card:** hero photo · name · rating + review count · price level ($–$$$$) · category ·
  distance · **"✨ AI pick"** tag when applicable.
- **Interaction:** hover card → highlight its pin; click pin → scroll to card. (We already have
  hover→pin wiring on the current plan; reuse it.)

### 3.4 Place detail
- Photo carousel · rating + a few top reviews · hours · price level · address ·
  **"Open in Google Maps"** · **"Add to day"** (accordion day picker — collapsed by default,
  expands to choose Day N, collapses on selection).
- Adding creates an itinerary item carrying **all** the data → the pin appears on the map
  automatically. The dead-text bug becomes structurally impossible.

### 3.5 AI curation layer
- A few results carry **"Suggested for your crew"** based on: trip vibe (existing
  questionnaire), rating threshold, popularity (review count), and "not already added."
- Optional **"✨ Plan this day"**: AI proposes a *sequence* of real places (breakfast → sight →
  lunch → afternoon → dinner), all addable in one tap, all pinned, all real.

---

## 4. Phase 1 — the foundation (fix the trip bug first)

Before Discover mode, ship the single highest-leverage fix:

**Add Place → real Google Autocomplete.** When the user adds a place they get autocomplete
against real data; whatever they pick lands on the map with its pin, photo, and rating. This
alone recovers the map-first promise that broke on the trip, ships in days, and is the literal
building block everything else stacks on.

Flow: debounced autocomplete (session-tokened) → user picks → fetch Place Details (field-masked)
→ create `itinerary_item` with `google_place_id` + coords + photo + rating → pin appears.

---

## 5. Google Places (New) — integration plan

### 5.1 Endpoints
| Endpoint | Use |
|---|---|
| **Autocomplete (New)** `places:autocomplete` | The add-place + discover search bar. Use **session tokens** (autocomplete keystrokes + the following Details call bill as one session — major saving). |
| **Text Search (New)** `places:searchText` | "Chinese food in Penang" → result list. The Discover query engine. |
| **Nearby Search (New)** `places:searchNearby` | "browse around this pin / hotel" by category. |
| **Place Details (New)** `places/{id}` | Full data for the detail view. **Field-masked** by SKU tier. |
| **Place Photos (New)** photo media | Actual images, fetched lazily on card/detail open. |

### 5.2 Field masking = the cost lever
The New Places API bills by **SKU tier** based on the fields you request:
- **Essentials** (id, basic) — cheapest
- **Pro** (location, type, address, hours)
- **Enterprise** (rating, review count, price level, website, phone)
- **Enterprise + Atmosphere** (review *content*, etc.) — priciest

Rule: **request only what each surface needs.**
- List/card view → Pro + rating (don't pull review content).
- Detail view → Enterprise (+ Atmosphere only if we show review text in-app).

### 5.3 Caching strategy (compliance + cost)
- `google_place_id` → **cache permanently** (allowed).
- Display snapshot (name, coords, 1 photo ref, rating, price) → cache in our DB with a **~30-day
  TTL**, refresh on access. Respect Google's caching policy; don't permanently host their content.
- Photos → cache short-term per policy; don't permanently rehost.
- **Shared server-side cache** (`cached_places` table): many users planning the same city hit the
  same restaurants — a shared cache is the single biggest cost saver.

### 5.4 Cost-control tactics
- **Server-side proxy all calls** — never expose the API key client-side. Central caching,
  rate-limiting, spend monitoring, and a per-day spend cap.
- Session tokens on autocomplete.
- Debounce autocomplete (≈300 ms, min 3 chars).
- Lazy photos — one photo on the card, the rest on detail open.
- Field masks everywhere.
- Shared `cached_places` across all users/trips.

### 5.5 Cost model (order-of-magnitude — verify current SKU pricing)
A heavy "plan a trip" session might do ~5 text searches + ~10 nearby + ~15 detail opens +
~30 photos. Uncached that's roughly **~$1/session**. With field masks + shared cache, materially
less. At ~1,000 trips planned/month that's **low hundreds to ~$1k/month** order of magnitude.
Google's historical $200/mo credit is being replaced by per-SKU free monthly caps (verify).
**Action: build spend monitoring + a kill-switch cap from day one.**

### 5.6 Attribution (required)
- "Powered by Google" wherever Places data shows without a Google map (we use Mapbox, so: always).
- Photo attributions and review-author attributions where shown.
- Design these into the card + detail components from the start, not bolted on.

---

## 6. Mapbox + Google together
- **Mapbox GL** renders the branded, custom-styled map + our pins/polylines. Unchanged.
- **Google** supplies place data only. We plot Google places as our own Mapbox markers using the
  lat/lng from Place Details. This is allowed with the attribution above.
- Keep `locationLat/Lng` on every item so it pins regardless of provider.

---

## 7. Data model changes (itinerary_items + new cache)
Add to `itinerary_items` (extends current title/type/dayDate/locationName/lat/lng/photoUrl/rating):
- `google_place_id` (text) — durable key
- `provider` ('google' | 'manual') — source
- `price_level` (int 0–4)
- `user_ratings_total` (int)
- `place_types` (text[]) — categories
- `address` (text)
- `photo_ref` (text) + cached display URL with TTL

New table `cached_places`:
- `place_id` (PK) · `snapshot` (jsonb) · `fetched_at` · `ttl` — shared cross-user cache.

---

## 8. Smart suggestions everywhere
- **Plan:** AI picks + "Plan this day" (above).
- **Expenses:** extend existing category smarts with "suggested split / this looks like a shared
  meal." Light touch — don't disturb what works.
- **Bookings:** richer real hotel cards (Google has hotel data; or keep Booking.com affiliate but
  upgrade the card visuals).

---

## 9. Roadmap (when we build)
1. **Phase 1 — Foundation:** Google Autocomplete add-place + server proxy + `cached_places` +
   spend monitoring. Fixes the trip bug. Ships fast.
2. **Phase 2 — Discover mode:** search + category chips + result cards + synced map pins + detail
   panel + accordion "Add to day."
3. **Phase 3 — AI curation:** "AI pick" tags + "Plan this day" sequence assembly, grounded in real
   results + trip vibe. AI Plan wizard outputs real cards.
4. **Phase 4 — Spread the pattern:** Expenses + Bookings suggestion polish; offline cache of an
   added itinerary's place data (important — travelers have spotty signal).

---

## 10. Open questions / risks
- **Cost at scale** — needs monitoring + caching + a spend cap from day one. (Decided: all-in
  Google, so this is the #1 operational risk.)
- **Caching compliance** — respect TTLs, don't permanently host Google photos.
- **Reviews in-app?** Review *content* is the priciest SKU tier and has display rules. Decide:
  show rating + "see reviews on Google," or pay for in-app review text.
- **Offline on the trip** — cache the added itinerary's place data locally so the plan works
  without signal. (The user was traveling with spotty data — this matters.)
- **Manual fallback** — keep a rare "can't find it? add manually" path for places Google misses.
- **Verify current Google SKU pricing + free-tier caps** before committing the cost model.

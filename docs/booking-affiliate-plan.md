# Build task — Sawia "Stays" (Booking.com affiliate only)

## Decision
One partner: **Booking.com**. Airalo and GetYourGuide are **switched off** for now (gate them, don't
delete — keep the code for later). Affiliate lives as **trip-contextual stays**: "you're sleeping in
Tokyo for 3 nights — here's where to look," not ad slots and not a discovery feed.

## What exists today (read before changing)
- `src/lib/affiliate/build-link.ts` — `buildBookingLink()` (+ Airalo builder), labels `paxawa-…`.
- `src/lib/affiliate/partners.ts` — `NEXT_PUBLIC_BOOKING_AID` (defaults `"preview"`), Airalo, GYG.
- `src/components/itinerary/book-mode.tsx` — the Book mode (hotels / flights / eSIM / activities),
  click intents + confirmations in **localStorage**; also a **hard-coded GetYourGuide link with
  `partner_id=preview`** (~L415).
- `src/components/wallet/bookings-board.tsx` embeds it.
- Trips have `destination`, `startDate`/`endDate`, and a **shape of bases** (the city you sleep in,
  with nights); itinerary items have `type` (incl. accommodation) and `baseId`.

## Problems to fix (why the old code was hidden)
1. **Four partners, half-wired** — Airalo/GYG are preview-only and noisy. Cut to one.
2. **`no_rooms: "1"` hard-coded** — wrong for a group; 6 friends ≠ 1 room.
3. **One link for the whole trip** — multi-city trips need a stay per base, with that base's dates.
4. **State in localStorage** — per device. In a *group* app nobody else sees "Aws is booking the
   hotel" or "Booked ✓". Must be shared, in the DB.
5. **No disclosure, no server-side click log** — can't reconcile with Booking reports.
6. **Labels still `paxawa-`** — partner reports key on them; rename to `sawia-` before real IDs.

## The feature
### A. One "Stays" card per base
For each base in the trip shape (or the whole trip if single-destination):
- **Title:** city · check-in → check-out (from the base's nights) · crew size.
- **State:**
  - *Needs a stay* → primary CTA **"Find stays on Booking.com"** (+ "Sawia may earn a commission").
  - *Someone's looking* → "Aws is checking stays" (shared intent, from the DB).
  - *Covered ✓* → an accommodation item exists for those nights → show the hotel name, no CTA.
- **Rooms:** default `ceil(crew / 2)`, adjustable on the card (1–10). Adults = crew size.
- Skip the departure night; never show a card for nights already covered.
- Bilingual EN/AR, RTL, Sawia design system.

### B. Deep link (update `buildBookingLink`)
Params: `aid`, `label`, `ss` (base city, or `latitude`/`longitude` if the base has coords — more
precise than a city string), `checkin`, `checkout`, `group_adults`, `no_rooms`, `selected_currency`
(trip currency), `lang` (ar/en). Open in a new tab, `rel="sponsored noopener"`.
**Label:** `sawia-{surface}-{tripId}` (keep ≤ ~64 chars; trip id is opaque, fine).

### C. Shared booking state (replace localStorage)
New table `stay_bookings`: `id, trip_id, base_id (nullable), status ('looking'|'booked'),
user_id, hotel_name (nullable), created_at, updated_at`. RLS: trip members read/write their trip only.
- Tap CTA → upsert `looking` for that base (visible to the crew) + log the click (D).
- Return to the app → the existing "Did you book it?" banner → **Yes** asks the hotel name → marks
  `booked` **and** creates an accommodation itinerary item for those nights (the existing anchor
  path), so the Plan and Wallet stay in sync. **No / Not yet** clears the prompt, keeps `looking`.

### D. Attribution + measurement
- Table `affiliate_clicks`: `trip_id, base_id, user_id, surface, partner('booking'), created_at`.
  Write server-side on each click (route handler that logs then 302s to the Booking URL — also stops
  the AID being scraped from the DOM).
- PostHog `affiliate_click` {partner, surface, trip_size, base_count} with the trip as the group.

### E. Config / flags
- `AFFILIATE_MODE = off | preview | live` (server env). `off` hides every Stays CTA; `preview`
  shows them with the placeholder AID (links work, no commission); `live` uses the real AID.
- `NEXT_PUBLIC_BOOKING_AID` → move to a **server** env (`BOOKING_AID`) since the redirect route now
  builds the URL.
- If the account is approved **through a network (CJ or Awin)** instead of Booking directly, the
  deep link must be wrapped in the network's tracking URL — support `BOOKING_LINK_TEMPLATE`
  (e.g. `https://…/click?url={encoded}`) so it's a config change, not a rewrite.

### F. Remove / gate
- Airalo + GYG: hide behind `AFFILIATE_PARTNERS=booking` (default). Remove the hard-coded GYG
  `partner_id=preview` link. Hide the eSIM and activities rows in Book mode.
- Flights row: keep as plain info or hide — no partner behind it.

### G. Compliance
- Visible "Sawia may earn a commission" on every Stays card; no cloaked/disguised links.
- Privacy policy: add one line — Sawia uses Booking.com affiliate links tracked through **CJ
  Affiliate** (Commission Junction); clicking takes you to Booking.com via CJ, which set their own
  tracking cookies — link to CJ's privacy policy (https://www.cj.com/legal/privacy). This is a
  **contractual requirement** of the CJ Publisher Service Agreement (§2(e)), not optional.
- Never put affiliate links in the trip chat, emails, or push notifications — the CJ agreement bans
  links in chat rooms/message boards/unsolicited messages. Stays cards only.
- Booking via CJ: links must go through CJ's tracking link (set `BOOKING_LINK_TEMPLATE` from the CJ
  deep-link generator once approved for the Booking.com APAC programme).
- Follow Booking's brand rules for any logo use (text-only "Booking.com" is safest).

## Non-goals (v1)
Airalo, GetYourGuide, flights, in-app hotel listings/prices (Booking's Demand API needs separate
approval), group voting on hotels (good v2 idea), any paywall.

## Verify before done
1. Single-city trip → one Stays card with correct dates, adults = crew, rooms = ceil(crew/2).
2. Multi-city trip → one card per base with that base's own dates; departure night excluded.
3. Member A taps CTA → member B sees "A is checking stays" without refreshing the whole app.
4. "Yes, booked" → card flips to Covered ✓ for everyone **and** an accommodation item appears on
   those nights in Plan.
5. Click logged in `affiliate_clicks` + PostHog; outgoing URL has `label=sawia-…`, never `paxawa-`.
6. `AFFILIATE_MODE=off` hides every CTA; `preview` works with placeholder AID; no Airalo/GYG anywhere.
7. EN + AR walk-through, RTL correct, disclosure visible.

## APPROVED — real CJ config (2026-09-28)
Booking.com APAC (CJ advertiser 7854081) approved the Sawia property.
- **CJ property ID (PID):** `101890695` ("Sawia - group trip planner")
- **Link ID used for deep links:** `17289049`
- **Exact deep-link format (generated in CJ, verified):**
  `https://www.kqzyfj.com/click-101890695-17289049?sid={SID}&url={URL-ENCODED booking.com URL}`
  → `BOOKING_LINK_TEMPLATE=https://www.kqzyfj.com/click-101890695-17289049?sid={sid}&url={url}`
- **Attribution:** use CJ's `sid` param for `sawia-{surface}-{tripId}` (replaces Booking's `label`).
  **Do NOT add Booking's own `aid`** to the destination URL when going through CJ — CJ supplies it;
  a stray `aid=preview` could break attribution. Keep `ss/checkin/checkout/group_adults/no_rooms/
  selected_currency/lang` on the destination URL.
- **Commission:** hotels 4%; attractions 4%; airport taxis 4%; cars 6% (pay now) / 3.8% (pay
  local); flights US$2/order. Paid only on **materialized** bookings (stay actually happened).

### Program rules that change the build
- **In-session only, 1-day referral, no cookie tracking.** A booking only pays if it's made in the
  same browser session as the click. So: every "Find/Book stays" button must fire a fresh tracked
  link — including when a member returns from the group chat to actually book (e.g. the "Aws is
  checking stays" state must still show a tracked "Open on Booking.com" button, never a plain URL).
- **No iframes** — always open Booking in a new tab/browser, never embed.
- **No affiliate links in the Dara app.** Booking bans links on sites in the "political/religion"
  avoidance category; a halal app is too close to that line. Sawia only.
- **No voucher/discount claims** ("save X% on Booking") and no cashback without Booking approval.
- **Marketing:** never bid on "Booking"/"Booking.com" search keywords or use them in domains.

## Owner action (blocks `live`)
Apply to Booking.com's Affiliate Partner Programme (directly, or via CJ/Awin depending on region) with
the Sawia site as the platform — Booking requires a website, not social-only. Once approved, set
`BOOKING_AID` (and `BOOKING_LINK_TEMPLATE` if via a network), then flip `AFFILIATE_MODE=live`.
Commission is commonly reported around 4% — confirm the real rate in the dashboard.

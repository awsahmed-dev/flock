# Arabic / RTL readiness audit — Sprint 9 Part 3 (+ Arabic-launch findings)

## Arabic-launch RTL check (fresh-translation sprint, live on paxawa.com)

Verified in Arabic mode on production — **working**: `dir=rtl` + `lang=ar`
switch; IBM Plex Sans Arabic renders as the primary family; the bottom
glass nav (mobile + desktop) mirrors automatically via flex direction —
tab order reads right-to-left, circles swap sides; Discover's split view
mirrors (list right, map left); the itinerary panel mirrors; ChipRail's
scroll fade flips to the left edge; dates render Arabic month/day names
(٨ نوفمبر); numbers stay Western digits everywhere (incl. money via
`fmtAmount` "ar-u-nu-latn"); plural forms (one/two/few/many) render
correctly (e.g. "3 عناصر", "عبر عملة واحدة").

**Flagged, not fixed (do in a follow-up commit):**
1. Server-cockpit hardcoded English shows through in Arabic — the hero
   "IN N DAYS" chip, "Keep packing — N% done", "Trip N% ready", "Plan
   days", "N going" + activity ticker, "Documents"/"See all →" (arrow
   also doesn't flip). Same list as §1 below — now user-visible.
2. Money page: "Balances", "You owe {name} …", "{a} owes {b}", "Settle",
   "Personal cap" are composed in code (expenses-board), not via t().
3. Itinerary desktop aside: the day header ("SUNDAY, NOVEMBER 8") and
   day chips ("Sun 8") render English dates while the cockpit chips are
   Arabic — a format call bypasses the locale wrapper; the DocumentCard
   date chip ("Nov 8") did too on that page. Investigate the module-level
   active-locale sync on that render path.
4. Document viewer / detail-panel gallery swipe DIRECTION is untested in
   RTL (glyphs already mirror via rtl:rotate-180).


**Status: the i18n framework the Sprint 9 brief asked to install already
exists and works.** This app does NOT use next-intl — it ships a homegrown
App-Router i18n layer that predates this sprint and covers the same ground:

| Brief deliverable | Where it actually lives |
| --- | --- |
| `src/i18n/en.json` | `src/lib/i18n/messages/en.json` (~45 namespaces) |
| `src/i18n/ar.json` | `src/lib/i18n/messages/ar.json` — **already fully translated**, not a placeholder |
| i18n framework | `src/lib/i18n/index.ts` — cookie-based locale negotiation (`paxawa_locale`), Accept-Language sniff, server-side dictionary load, ICU-style interpolation + plurals; client side via `LocaleProvider` + `useT` (`src/components/i18n/locale-provider.tsx`) |
| Locale switching | `src/components/i18n/language-switcher.tsx` (sets the cookie; works today) |
| `dir="rtl"` on `<html>` | `src/app/layout.tsx` — `lang` + `dir` already switch with the locale |
| Date localization | `src/lib/i18n/date-fns.ts` — module-level active-locale wrapper; Arabic month/day names already render |
| Arabic-digit input | `src/lib/numerals.ts` `normalizeDigits` — ٠-٩ / ۰-۹ / ٫ already normalized in amount inputs |

Cookie-over-`/[lang]/` routing is a deliberate architecture decision (see
the header comment in `src/lib/i18n/index.ts`): stable invite URLs, share
links, and the service-worker cache all survive. Replacing this with
next-intl would be a regression, not preparation.

**Done in this sprint (Sprint 9 Part 3):**
- Arabic font: **IBM Plex Sans Arabic** via `next/font/google`
  (`src/app/layout.tsx`) — chosen over Cairo for its geometric cut that
  matches Inter. The `--font-arabic` variable is attached to `<html>` only
  when the locale is Arabic, so Latin users never download it. Applied by
  `html[dir="rtl"] body` in `globals.css`.
- `fmtAmount` (`src/lib/numerals.ts`) now formats with the APP locale
  (`ar-u-nu-latn` — Arabic grouping, Latin digits per money-UI convention)
  instead of the browser default.

---

## 1. Remaining hardcoded strings (Step 1 gap list)

Client components overwhelmingly read from `messages/*.json` via `useT`.
The remaining hardcoded English is concentrated in **server components**,
which need `getDictionary(await getLocale())` + `tFromDict` threading:

- `src/components/trips/cockpit/planning-cockpit.tsx` — "Plan days",
  "Invite your crew", "The crew's shortlist", primary-action labels
- `src/components/trips/cockpit/departure-cockpit.tsx`,
  `recap-cockpit.tsx`, `metric-grid.tsx`, `crew-pulse.tsx` ("N going",
  ticker fallback), `day-pill-rail.tsx` ("Plan days")
- `src/components/trips/trip-shell.tsx` — "All trips", account-menu rows
- `src/components/itinerary/add-item-dialog.tsx` — "Add item", "Cancel",
  field labels
- `src/components/map/mapbox-plan-map.tsx` — "Loading map…", error card
- `src/components/documents/pdf-view.tsx` — PDF error string
- Marketing/legal/blog (`src/components/landing/*`, `blog/*`, `legal/*`)
  — English-only by design for now; **lower priority** per the brief.

Recommended approach: give the cockpit tree a `dict` prop from the trip
page (one `getDictionary` call), or convert those leaves to client
components that call `useT` — do NOT introduce a second framework.

## 2. Physical → logical CSS (Step 3 audit)

~67 occurrences of physical directional classes remain (`ml-/mr-/pl-/pr-/
text-left/text-right/left-N/right-N`); the codebase otherwise already uses
logical `ps/pe/ms/me/start/end` widely. Worst offenders (excluding the
LTR-only landing pages):

- `expenses/expenses-board.tsx` (6) · `chat/message-bubble.tsx` (4)
- `expenses/transactions-page.tsx` (3) · `documents/documents-board.tsx` (3)
- `animate-ui/components/radix/switch.tsx` (3 — thumb translate needs an
  RTL-aware transform, not just a class swap)
- 1–2 each: `ui/dropdown-menu.tsx`, `ui/dialog.tsx`, `pwa/install-prompt.tsx`,
  `legal/cookie-banner.tsx`, `itinerary/itinerary-board.tsx`,
  `feedback/feedback-widget.tsx`, `expenses/budget-health.tsx`,
  `expenses/add-expense-dialog.tsx`, `dashboard/onboarding-card.tsx`,
  `auth/login-form.tsx`, `chat/chat-sidebar.tsx`, `expenses/balances-page.tsx`

## 3. Directional icons (Step 3 icon list)

44 call sites already mirror with `rtl:rotate-180`. Files using
Caret/Arrow icons with **no** mirroring yet:

- `ui/dropdown-menu.tsx` (submenu caret)
- `discover/place-detail-panel.tsx` (gallery arrows — note: gallery swipe
  direction itself must flip in RTL, not just the glyphs)
- `discover/discover-feed.tsx` · `expenses/expense-sheet.tsx`
- `expenses/transactions-page.tsx` · `chat/chat-sidebar.tsx`
- `animate-ui/components/community/motion-carousel.tsx` (motion direction)
- `blog/blog-shell.tsx` · `legal/legal-shell.tsx` (LTR-only surfaces — skip)

## 4. Bottom nav in RTL

No work needed: the nav row is a plain flex row of [left circle · pill ·
right circle] with logical spacing — under `dir="rtl"` flexbox lays the
row out right-to-left automatically, which IS the required mirror. The
pill's tab order likewise follows direction. Only the fadeIn keyframe and
the TabsHighlight spring are direction-neutral. Verify visually when
Arabic ships.

## 5. Number / date / currency formats (Step 5 gap list)

- `fmtAmount` — fixed this sprint (app-locale aware).
- ~65 other raw `toLocaleString` / `toFixed` sites remain; most are
  developer-facing or feed `<input>` values (must stay ASCII — inputs
  reject Eastern digits; `normalizeDigits` handles paste). User-visible
  ones to migrate to `Intl.NumberFormat(getActiveLocale())`:
  `expenses/balances-page.tsx` (settlement amounts), `budget-health.tsx`
  (percentages), `discover` distance labels ("1.2 km"), Wrap/metric
  stats in `cockpit/metric-grid.tsx`.
- Dates already flow through `src/lib/i18n/date-fns.ts` in almost all
  surfaces; audit found no raw `Intl.DateTimeFormat` calls outside it.
- Currency symbol PLACEMENT (SAR/ريال trails in Arabic) is handled by
  `Intl.NumberFormat` with `style: "currency"` — the app mostly renders
  code + amount ("USD 1,500") which is direction-safe as-is.

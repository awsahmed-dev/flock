# Paxawa pre-launch smoke test

Walk through this start-to-finish before sharing the URL with anyone outside
the founder circle. Anything that breaks → fix → re-test before moving on.

Time budget: **~25 minutes**.

---

## 0. Setup

- [ ] Have **2 devices** ready (laptop + phone) and **2 accounts** (your main
      + a throwaway/incognito). The crew features only feel real with at
      least 2 members.
- [ ] Have https://paxawa.com open on the laptop, signed out.
- [ ] Open Resend → Logs in a third tab to verify emails fire.
- [ ] Open PostHog → Live events in a fourth tab.
- [ ] Open Sentry → Issues to make sure nothing 500s during the test.

---

## 1. Landing (anonymous)

- [ ] `paxawa.com` loads, headline reads cleanly, aurora drifts.
- [ ] Header anchor nav (`Features` / `Try it` / `Destinations` / `Pricing`)
      smooth-scrolls to each section.
- [ ] **Chat demo**: type something with money in it ("paid €120 for sushi"),
      send → chips appear under the bubble → tapping "Log expense" shows the
      green confirmation flash.
- [ ] **Vote demo**: click any option → bars animate, trophy moves to your
      pick, count updates.
- [ ] **Expense demo**: change amount + currency + payer → per-person split +
      "You paid / You owe" cards update live.
- [ ] **Itinerary demo**: drag any card by the grip handle → reorders cleanly.
- [ ] **Packing demo**: switch tabs (Shared / Yours / Crew) → progress bar
      animates → toggling items updates counts.
- [ ] Cookie banner appears within 1 second → click "Allow" → no console errors.
- [ ] Waitlist form in the closing accepts a real email → confirmation row
      replaces the form. Resubmit same email → still says "you're in".
- [ ] `/terms`, `/privacy`, `/404` all branded with the new logo + no broken
      links.

## 2. Signup + auth

- [ ] Click `Sign up` → **Sign in with Google** → ends on `/dashboard` of
      `paxawa.com` (no flicker through `flock-pi-six.vercel.app` or
      `www.paxawa.com`).
- [ ] PostHog Live Events shows `signup`.
- [ ] Sentry has no new issues for this signup.
- [ ] Sign out → sign back in with a different Google account → also lands
      cleanly on `/dashboard`.

## 3. First trip (account A)

- [ ] Dashboard shows the new onboarding card (no trips yet).
- [ ] Click `Plan your first trip` → fill the form → submit.
- [ ] Trip page loads, you're auto-added as a member with role `owner`.
- [ ] Click avatar → menu shows Calendar export, Share, Theme, Keyboard
      shortcuts, Settings, Sign out (no toolbar wall of icons).
- [ ] Press `?` → keyboard shortcuts overlay opens. Press `g i` → routes to
      itinerary. `g v` → votes. `g p` → packing. `g d` → docs. `g s` →
      settings. `g h` → overview.
- [ ] PostHog event: `trip_created` fires (when you implement that wiring
      later — currently only the demos fire it).

## 4. Invite + second member (account A → B)

- [ ] On account A, click Crew icon → copy invite link.
- [ ] Open invite link on phone (account B), accept → auto-joins, lands on
      trip page.
- [ ] On account A: email arrives from `hello@paxawa.com` with subject
      "🎉 X joined …".
- [ ] On account A: web-push notification fires (if push is enabled on
      that device).
- [ ] On account A's Crew sheet, account B's name appears.

## 5. Itinerary

- [ ] On account A: add an itinerary item (any type) → it appears immediately.
- [ ] On account B: see the new item without refreshing (or after a few
      seconds of polling).
- [ ] Drag-reorder items → other member sees the new order.
- [ ] Try the AI planner → generates items.
- [ ] Calendar export: from the avatar dropdown → `Add to calendar` →
      downloads a `.ics` → import into Apple Calendar or Google → events
      show up at the right times on the right days.

## 6. Vote flow

- [ ] On account A: create a vote with 3+ options + cost estimates.
- [ ] Account B receives an email + push notification immediately.
- [ ] Account B casts a vote → account A sees the tally update live.
- [ ] Close the vote (account A) → the resolved state shows up correctly on
      the trip overview's "Decisions" / share page.

## 7. Expenses + multi-currency

- [ ] Account A logs an expense in `USD`.
- [ ] Account B logs an expense in `EUR`.
- [ ] Expenses board: totals appear stacked (USD X / EUR Y), not summed.
- [ ] Budget alert: log a big expense that crosses 75% / 90% / 100% of the
      trip budget → a 🤖 message lands in chat from the budget watcher.
- [ ] Account B receives an email + push for each expense that affects them.

## 8. Chat + AI smart actions

- [ ] On account A, post a real message: "let's grab dinner at El Vilsito
      tomorrow at 8 — \$40 each".
- [ ] Within ~1s, smart action chips appear under the bubble.
- [ ] Tap "Add to plan" → confirms in the toast → itinerary now has the item.
- [ ] Pin a message → pinned bar at top of chat shows it.
- [ ] Mark account B's last-read by switching to their chat → ✓✓ should show
      on account A's older messages.
- [ ] Type something while account B is in chat → typing indicator appears
      on B's side.

## 9. Packing

- [ ] Empty state → click "Start with suggestions" → seeds 9 baseline items.
- [ ] Toggle some shared + personal items → progress bar updates.
- [ ] Crew tab shows account B's progress.

## 10. Documents

- [ ] Upload a small PDF → appears in the Files tab.
- [ ] Upload an image → appears in the Photos tab + the gallery lightbox.
- [ ] Pin a doc to a day → shows under "Pinned to days".

## 11. Share link (public)

- [ ] On account A: enable share → copy link.
- [ ] Open in an incognito window (signed out) → trip recap loads with:
  - Hero with destination + dates + member count
  - Photos strip (if any uploaded)
  - Decisions section (resolved votes)
  - Real spend totals per currency
  - Day-by-day itinerary
  - CTA footer to sign up
- [ ] Paste the link in WhatsApp / iMessage → preview card shows the OG
      image with destination + dates (not Vercel default).

## 12. Settings

- [ ] Trip settings: change name, dates, budget → saves and reflects.
- [ ] Delete the test trip (account A is owner) → both accounts redirected
      away cleanly.

## 13. Mobile sweep

Open https://paxawa.com on a real phone:

- [ ] Landing scrolls cleanly, no horizontal overflow.
- [ ] All 5 demos work on touch (chat input not covered by keyboard, vote
      taps register, expense inputs editable, itinerary drag-and-drop works
      with finger, packing toggle works).
- [ ] Sign in via Google on phone → lands on `paxawa.com/dashboard`.
- [ ] Add to home screen → manifest icon appears (Paxawa mark, not
      placeholder).
- [ ] Receive a push notification (after enrolling via avatar → Enable
      notifications).

## 14. Operational

- [ ] Sentry has zero new ERROR issues from the full walkthrough above.
- [ ] PostHog Live Events stream shows `signup`, `vote_opened`,
      `expense_logged` from the test session.
- [ ] Resend Logs shows every expected email delivered (invite,
      vote_opened, expense_logged, budget_alert).
- [ ] In-app **Feedback widget** (floating button bottom-right): click →
      modal opens → leave a rating + body → submit → email arrives at
      `hello@paxawa.com` within ~10s.
- [ ] `/api/health` returns `200 ok` from production.
- [ ] DevTools network tab: no failed requests on any page.
- [ ] DevTools console: no red errors on any page (warnings OK).

## 15. Launch-day-only

- [ ] Vercel git auto-deploy is connected (Settings → Git → GitHub repo
      linked). Otherwise you'll be manually deploying every push.
- [ ] Supabase URL config has `paxawa.com` AND `www.paxawa.com` in the
      Redirect URLs whitelist.
- [ ] Supabase Site URL = `https://paxawa.com/auth/callback`.
- [ ] HaveIBeenPwned password check is ON in Supabase Auth.

---

## When all green

Then the URL is safe to share with:

- 20 personal friends (group-DM the link, ask for blunt feedback)
- 2–3 group-travel subreddits (`r/travel`, `r/solotravel` if relevant)
- Beta Slack channels you're already in
- **Hold Product Hunt for week 3** — wait for the first batch of friend
  feedback to land first.

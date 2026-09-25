-- 2026-09-25 — personal expenses are private to their payer.
--
-- "Just me" was private only in the balance maths: any trip member could
-- read every expense, including other members' personal ones. The app now
-- filters them out server-side (src/lib/expense-visibility.ts); this makes
-- the same rule hold for any direct client read.
--
-- The server connects as the database owner and is unaffected. Shared
-- expenses are unchanged; expense_splits only ever exist for shared ones.
drop policy if exists expenses_select_member on expenses;
create policy expenses_select_member on expenses
  for select
  using (is_trip_member(trip_id) and (scope = 'shared' or paid_by = auth.uid()));

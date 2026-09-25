-- 2026-09-25 — flights you can edit, and people outside the trip.
--
-- Additive only: two new tables and nullable columns. Nothing existing is
-- rewritten, and every current query keeps working unchanged.

-- ─── Flights ────────────────────────────────────────────────────────────────
-- A flight booking knew its airline, number and departure time but not WHERE
-- it went — so a ticket changed from Kuala Lumpur→Jeddah to Kuala
-- Lumpur→Riyadh had no field to change. Departure date/time stay on the
-- anchor stop (itinerary_items.day_date / start_time) as before.
alter table bookings add column if not exists origin       text;
alter table bookings add column if not exists destination  text;
alter table bookings add column if not exists arrive_date  date;
alter table bookings add column if not exists arrive_time  text;

-- ─── People outside the trip ────────────────────────────────────────────────
-- A split could only ever point at a registered trip member
-- (expense_splits.user_id → profiles), so "the people I had dinner with in
-- Jeddah" had nowhere to live. These are names, owned by ONE person in ONE
-- trip: no account, no invite, and invisible to the rest of the crew. They
-- never enter the crew's balances — expenses that involve them are personal.
create table if not exists trip_contacts (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id)    on delete cascade,
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index if not exists trip_contacts_trip_owner_idx on trip_contacts (trip_id, owner_id);

-- One row per outside person on an expense.
--   owes_me — I paid; they owe me their share.
--   i_owe   — they paid; I owe them my share.
-- The expense row itself stores MY share as its amount, so every existing
-- total (the hero, the budget strip, the daily tracker, the cockpit) already
-- counts what I consumed rather than what I fronted — no spend maths changes.
create table if not exists contact_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references expenses(id)      on delete cascade,
  contact_id  uuid not null references trip_contacts(id) on delete cascade,
  direction   text not null check (direction in ('owes_me', 'i_owe')),
  amount      real not null check (amount >= 0),
  settled     boolean not null default false,
  settled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (expense_id, contact_id)
);
create index if not exists contact_splits_contact_idx on contact_splits (contact_id);

-- What the whole bill came to, when it was split with people outside the
-- trip. Display only ("your share of SAR 200"); null everywhere else.
alter table expenses add column if not exists bill_total real;

-- ─── Row-level security ─────────────────────────────────────────────────────
-- The app writes through the server (which checks membership itself); these
-- policies are the second lock for any client-side read.
alter table trip_contacts  enable row level security;
alter table contact_splits enable row level security;

drop policy if exists trip_contacts_owner_all on trip_contacts;
create policy trip_contacts_owner_all on trip_contacts
  for all
  using      (owner_id = auth.uid() and is_trip_member(trip_id))
  with check (owner_id = auth.uid() and is_trip_member(trip_id));

drop policy if exists contact_splits_owner_all on contact_splits;
create policy contact_splits_owner_all on contact_splits
  for all
  using (exists (
    select 1 from trip_contacts c
    where c.id = contact_splits.contact_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from trip_contacts c
    where c.id = contact_splits.contact_id and c.owner_id = auth.uid()
  ));

-- The flight number used to be glued into the stop title ("Saudia — SV 826"),
-- so it couldn't be edited back out without parsing prose. Its own field.
alter table bookings add column if not exists flight_number text;

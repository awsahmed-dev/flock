-- 2026-09-26 — Stays: the shared "someone's looking / booked" state, and a
-- log of every affiliate click.
--
-- Additive only. Nothing in the app reads these until Stays ships, and the
-- feature is off by default (AFFILIATE_MODE).

-- ─── Who is sorting out which stay ─────────────────────────────────────────
-- "Someone's looking" used to live in localStorage, so in a group app nobody
-- else ever saw it. One row per (trip, stay, person).
--
-- A stay is named by its stay key ("jeddah", "jeddah#2") PLUS its check-in:
-- keys are positional, so after the route is reordered «jeddah#2» can mean a
-- different visit. A row whose check-in no longer matches the stay is stale
-- and ignored, rather than pinned to the wrong nights.
--
-- Whether a stay is COVERED is not stored here at all — it is derived from
-- the hotel stops on the plan, so it can never disagree with the plan.
create table if not exists stay_bookings (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references trips(id)    on delete cascade,
  stay_key             text not null,
  check_in             date not null,
  user_id              uuid not null references profiles(id) on delete cascade,
  status               text not null check (status in ('looking', 'booked')),
  hotel_name           text check (hotel_name is null or char_length(hotel_name) <= 140),
  prompt_dismissed_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (trip_id, stay_key, check_in, user_id)
);
create index if not exists stay_bookings_trip_idx on stay_bookings (trip_id);

-- ─── Every tap on an affiliate link ────────────────────────────────────────
-- Written by the redirect route BEFORE it sends anyone to the partner, so a
-- click can be matched against the network's report by its `sid`. Holds no
-- name or email: the sid is the surface plus the first 8 characters of the
-- trip id.
create table if not exists affiliate_clicks (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  stay_key    text,
  user_id     uuid references profiles(id) on delete set null,
  partner     text not null default 'booking',
  surface     text not null,
  mode        text not null check (mode in ('preview', 'live')),
  sid         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists affiliate_clicks_trip_idx on affiliate_clicks (trip_id, created_at desc);

-- ─── Row-level security ─────────────────────────────────────────────────────
alter table stay_bookings    enable row level security;
alter table affiliate_clicks enable row level security;

-- The crew sees who is looking; each person writes only their own rows.
drop policy if exists stay_bookings_member_read on stay_bookings;
create policy stay_bookings_member_read on stay_bookings
  for select using (is_trip_member(trip_id));
drop policy if exists stay_bookings_own_write on stay_bookings;
create policy stay_bookings_own_write on stay_bookings
  for all
  using      (user_id = auth.uid() and is_trip_member(trip_id))
  with check (user_id = auth.uid() and is_trip_member(trip_id));

-- Clicks are written by the server only; a person may read their own.
drop policy if exists affiliate_clicks_own_read on affiliate_clicks;
create policy affiliate_clicks_own_read on affiliate_clicks
  for select using (user_id = auth.uid());

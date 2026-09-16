-- Planning v3: the trip's SHAPE becomes trip state (docs/planning-city-first.md).
--
-- Structure lived inside trip_packages.payload, which was both the source of
-- truth and a frozen blob — so editing the shape after adoption had no defined
-- behaviour. Segments are the truth now; the day grid is a projection.

create table if not exists trip_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  base_id text not null,
  sort_order integer not null default 0,
  check_in date not null,
  check_out date not null,
  transport_in_mode text,
  transport_in_minutes integer,
  day_trips jsonb not null default '[]'::jsonb,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_segments_dates_ck check (check_out >= check_in)
);

create index if not exists trip_segments_trip_idx on trip_segments (trip_id, sort_order);
-- One row per base per trip: the shape is a set of stays, not a log.
create unique index if not exists trip_segments_trip_base_uq on trip_segments (trip_id, base_id);

create table if not exists segment_reactions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  base_id text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists segment_reactions_uq
  on segment_reactions (trip_id, base_id, user_id);

-- The code has always assumed one package row per trip (findFirst + a
-- singular "existing"), but nothing enforced it. Dedupe, then enforce.
delete from trip_packages a
  using trip_packages b
  where a.trip_id = b.trip_id and a.created_at < b.created_at;
create unique index if not exists trip_packages_trip_uq on trip_packages (trip_id);

-- Adoption dropped the day's city on the floor, so base grouping died at the
-- itinerary boundary and the day grid had no idea where you were. The
-- projection writes it now.
alter table itinerary_items add column if not exists base_id text;
create index if not exists itinerary_items_base_idx on itinerary_items (trip_id, base_id);

-- User testing: the whole Arabic corpus was invisible. The projection wrote
-- only the English name/why into itinerary_items, so an Arabic reader got a
-- plan in English with Arabic chrome around it — «البازار الكبير» existed in
-- the library and never reached a screen. Both languages are stored now and
-- the grid picks by locale.
alter table itinerary_items add column if not exists title_ar text;
alter table itinerary_items add column if not exists top_tip_ar text;

-- User testing: a tester deleted a stop, later added a base, and the deleted
-- stop came back — the shape re-projects and rewrites every package row, so
-- an evening of trimming would vanish in one tap. Deletions of curated stops
-- are remembered, so a rebuild honours them.
create table if not exists trip_removed_stops (
  trip_id uuid not null references trips(id) on delete cascade,
  base_id text,
  title text not null,
  removed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (trip_id, title)
);

-- (reverted) A party-composition column pair lived here briefly. Profiling
-- who is on a trip is not this app's job — pacing is a control the user
-- reaches for, not an inference we make about their household.

-- A city we do not curate is still a city you can sleep in.
--
-- "I tried Lisbon and it told me to go to Discover — how will Discover build
-- me a package?" It can't. A destination with no curated route had no shape
-- at all, and "Add a base" could only ever offer cities from the same
-- curated region, so there was no way to add an arbitrary one either.
-- A custom base carries its own name and coordinates on the segment.
alter table trip_segments add column if not exists custom_name text;
alter table trip_segments add column if not exists custom_name_ar text;
alter table trip_segments add column if not exists custom_lat double precision;
alter table trip_segments add column if not exists custom_lng double precision;

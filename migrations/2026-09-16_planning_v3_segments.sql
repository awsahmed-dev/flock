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

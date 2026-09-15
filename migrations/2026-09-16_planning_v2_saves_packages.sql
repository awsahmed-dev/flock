-- Planning v2 — the saves layer + packages.
-- docs/planning-ux-audit.md: Discover / reel import / manual search become
-- feeders into one saves layer; the plan pulls from it. Packages are held as
-- draft documents so a generated plan can never be destroyed by closing a
-- sheet, and so the crew can react before it becomes the itinerary.

create table if not exists save_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  folder_id uuid references save_folders(id) on delete set null,
  place_id text,
  place_name text not null,
  photo_ref text,
  category text,
  rating real,
  address text,
  lat real,
  lng real,
  source text not null default 'discover',
  source_url text,
  note text,
  status text not null default 'saved',
  item_id uuid references itinerary_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists saved_places_user_idx on saved_places (user_id, created_at desc);
create index if not exists saved_places_trip_idx on saved_places (trip_id, created_at desc);

create table if not exists trip_packages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  subtitle text,
  tier text not null default 'assembled',
  status text not null default 'draft',
  payload jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_packages_trip_idx on trip_packages (trip_id, created_at desc);

create table if not exists package_reactions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references trip_packages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  day_index integer not null,
  reaction text not null,
  veto_place_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists package_reactions_unique
  on package_reactions (package_id, user_id, day_index, coalesce(veto_place_id, ''));

-- Carry the old per-trip wishlist into the new spine so nobody's saves vanish.
insert into saved_places (user_id, trip_id, place_id, place_name, photo_ref, category, rating, address, lat, lng, source, created_at)
select w.user_id, w.trip_id, w.place_id, w.place_name, w.photo_ref, w.category, w.rating, w.address, w.lat, w.lng, 'discover', w.created_at
from trip_wishlist w
where not exists (
  select 1 from saved_places s
  where s.user_id = w.user_id and s.trip_id = w.trip_id and s.place_id = w.place_id
);

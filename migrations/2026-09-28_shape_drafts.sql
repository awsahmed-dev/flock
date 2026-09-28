-- 2026-09-28 — A shape is a draft until the owner confirms it.
--
-- Picking a route wrote the cities and every day's stops on the tap, so
-- looking at a route and going back left the trip already planned. The
-- shape screen now edits this row; "Confirm" copies it into trip_segments
-- and builds the days. One draft per trip, cascades with the trip.
--
-- Additive only. The app reads and writes it through the server (Drizzle,
-- service role); the policies below keep direct client access to the crew.

create table if not exists trip_shape_drafts (
  trip_id         uuid primary key references trips(id) on delete cascade,
  segments        jsonb not null,
  arrive_base_id  text,
  depart_base_id  text,
  created_by      uuid references profiles(id) on delete set null,
  updated_at      timestamptz not null default now()
);

alter table trip_shape_drafts enable row level security;

drop policy if exists trip_shape_drafts_member_read on trip_shape_drafts;
create policy trip_shape_drafts_member_read on trip_shape_drafts
  for select using (is_trip_member(trip_id));

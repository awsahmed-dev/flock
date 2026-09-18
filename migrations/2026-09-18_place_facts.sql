-- What Google knows about a place we curate.
--
-- "Don't ever invent something where we can already have it. We already pay
--  for Google Maps — the locations, the places, the images, the ratings, the
--  information. To invent something is a disrespect to what we already have."
--
-- Every curated place used to carry a rating we made up. Discover has been
-- talking to Google Places this whole time; the curated corpus simply never
-- asked it anything. This table is the cache that fixes that: one row per
-- curated place name, filled from the Places API, read by the plan.
--
-- `missing` matters as much as the data. A place Google cannot resolve is
-- recorded as a miss rather than retried on every render, and the plan then
-- shows no rating at all — which is the honest outcome and the one the app
-- promised.

CREATE TABLE IF NOT EXISTS place_facts (
  -- the curated place's English name, which is the join key everywhere else
  name              text PRIMARY KEY,
  google_place_id   text,
  rating            real,
  -- the number a rating means nothing without: "4.4" from eleven people is
  -- not "4.4" from eleven thousand
  rating_count      integer,
  price_level       integer,
  photo_ref         text,
  formatted_address text,
  lat               double precision,
  lng               double precision,
  /** metres between Google's answer and our own hand-checked coordinate */
  offset_m          integer,
  /** Google had nothing we could confidently match */
  missing           boolean NOT NULL DEFAULT false,
  fetched_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE place_facts IS
  'Google Places facts for curated places, cached. Never hand-written.';
COMMENT ON COLUMN place_facts.offset_m IS
  'distance from our hand-checked coordinate; a large value means a bad match';

-- And somewhere on the plan to put the number that gives a rating meaning.
-- "4.4" on its own was the original complaint — 4.4 from eleven people and
-- 4.4 from eleven thousand are not the same claim.
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS rating_count integer;

-- Open-jaw trips: the city you land in and the city you fly home from.
--
-- "I'll be entering the country from this place or this city, and then I
-- travel back from this city or a different city." Until now the shape had
-- no way to hold that: a route was a chain with no stated ends, so a trip
-- that lands in Porto and flies home from Lisbon could only be built by
-- dragging and hoping, and the "still to book" list never mentioned the
-- international flights at all.
--
-- City-level on purpose. The airport code is a booking detail; the decision
-- a person actually makes when planning is which city.
--
-- Both nullable: a trip with neither is a round trip through its first base,
-- which is the overwhelmingly common case and must not require an answer.

ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrive_base_id text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS depart_base_id text;

COMMENT ON COLUMN trips.arrive_base_id IS
  'base id (or custom:<slug>) the trip flies into; NULL = the shape''s first base';
COMMENT ON COLUMN trips.depart_base_id IS
  'base id (or custom:<slug>) the trip flies home from; NULL = the shape''s last base';

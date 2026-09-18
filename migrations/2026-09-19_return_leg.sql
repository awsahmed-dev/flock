-- A city you come back to.
--
-- "I'll be landing in Jeddah, stay five days, go to Riyadh for the rest,
-- then come back to Jeddah and fly home from there."
--
-- trip_segments_trip_base_uq said that was impossible. Its comment was
-- "one row per base per trip: the shape is a set of stays, not a log",
-- and that was a fair reading of a trip right up until the trip has a
-- return leg. A shape is a sequence, and a sequence may revisit.
--
-- What replaces it is the constraint that was actually meant: a trip's
-- stays occupy distinct positions. That still rejects the duplicate rows
-- the old index existed to prevent, and permits the one arrangement it
-- was wrongly forbidding.
--
-- base_id keeps meaning THE CITY, deliberately. Both Jeddah rows say
-- "jeddah", so `arrive = depart` still reads as one round trip rather
-- than two one-way tickets, and the city page, the reactions and the
-- cached Google ideas go on treating both legs as the same place —
-- which they are. Which STAY is meant is derived from position at the
-- edge (lib/packages/stay-key.ts), never stored.

drop index if exists trip_segments_trip_base_uq;

create unique index if not exists trip_segments_trip_order_uq
  on trip_segments (trip_id, sort_order);

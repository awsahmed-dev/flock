-- More to do in a city than we curate.
--
-- Langkawi has fourteen curated places. A five-night stay uses all
-- fourteen. After that "You could add" is structurally empty — the screen
-- whose entire job is answering "what do I do here" runs out of answers
-- exactly when someone has planned enough to start asking.
--
-- The corpus is finite on purpose and the city is not, so the rest comes
-- from Google Places: the API Discover already uses and we already pay for.
-- Cached per city because a city's places do not change hourly, and one
-- call a week per city is the difference between a feature and a bill.

CREATE TABLE IF NOT EXISTS city_ideas (
  base_id    text PRIMARY KEY,
  places     jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE city_ideas IS
  'Google Places results per curated base, cached. Tops up the finite corpus.';

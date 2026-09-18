-- Clear the ratings we invented.
--
-- Every curated place in the corpus carried one, and all of them were
-- authored rather than sourced. The distribution gave it away — a smooth
-- bell from 4.1 to 4.9 with no 3.x and no 5.0, which no real review data
-- has ever looked like — and one Batumi restaurant that had been entered
-- twice under two spellings of its own name proved it, carrying 4.3 on one
-- card and 4.5 on the other. A sourced number cannot disagree with itself.
--
-- They rendered as "★ 4.7" next to a place name, which reads as a review
-- score, while the app told the user review counts were impossible without
-- a Google key.
--
-- The code no longer writes them, but rows generated before that change
-- still hold them, and a plan nobody edits again would go on showing stars
-- forever. Only `provider = 'package'` rows are touched: a rating on a
-- place the crew SAVED came from Google and is real.

UPDATE itinerary_items
SET rating = NULL
WHERE provider = 'package'
  AND rating IS NOT NULL;

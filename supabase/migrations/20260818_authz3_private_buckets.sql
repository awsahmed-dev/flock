-- authz-3: trip-documents and chat-media become PRIVATE. Reads go through
-- /api/storage/<bucket>/<path> (auth + membership from the object path).
-- Applied to production 2026-08-18 AFTER the proxy code was deployed:
--   1. rewrite stored URLs to the proxy form (works with public or private)
--   2. flip the buckets
-- avatars stays public (profile pictures; no trip data).
update documents   set url         = replace(url,         'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/', '/api/storage/trip-documents/') where url         like 'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/%';
update expenses    set receipt_url = replace(receipt_url, 'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/', '/api/storage/trip-documents/') where receipt_url like 'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/%';
update bookings    set pdf_url     = replace(pdf_url,     'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/', '/api/storage/trip-documents/') where pdf_url     like 'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/%';
update trip_photos set url         = replace(url,         'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/', '/api/storage/trip-documents/') where url         like 'https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public/trip-documents/%';

update storage.buckets set public = false where id in ('trip-documents', 'chat-media');

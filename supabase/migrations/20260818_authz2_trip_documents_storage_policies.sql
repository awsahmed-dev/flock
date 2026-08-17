-- Applied to production 2026-08-18 via Supabase MCP (apply_migration
-- "authz2_trip_documents_storage_policies"). Kept here so the policy is
-- reviewable in git — the app has no other migration trail for storage RLS.
--
-- authz-2: `trip_docs_all` granted ALL on trip-documents to the PUBLIC role —
-- anon could list every user's/trip's object paths, upload, overwrite and
-- delete anything in the bucket (verified by REST probe with the anon key).
-- Replace with: members list their trip's folder or their own folder; anyone
-- authenticated may upload under their own uid folder (existing policy) or
-- under <tripId>/bookings/ if they are a member of that trip; only the
-- uploader may delete (existing policy).
--
-- Still open, deliberately: the bucket itself is PUBLIC, so a leaked object
-- URL stays readable. Making it private means signed URLs at every render
-- site plus the offline document cache — a product decision, not a sweep.
drop policy if exists "trip_docs_all" on storage.objects;

create policy "trip_documents_member_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        and public.is_trip_member(((storage.foldername(name))[1])::uuid)
      )
      or (
        (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
        and public.is_trip_member(((storage.foldername(name))[2])::uuid)
      )
    )
  );

create policy "trip_documents_member_booking_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-documents'
    and (storage.foldername(name))[2] = 'bookings'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

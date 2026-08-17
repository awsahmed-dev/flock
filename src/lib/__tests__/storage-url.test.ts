import { describe, it, expect } from "vitest";
import { toProtectedUrl, parseStorageUrl, pathGrant, isStoredFileUrl, protectedFileUrl } from "@/lib/storage-url";

const REF = "https://jrlmtsgnchjghhgufjyh.supabase.co/storage/v1/object/public";
const U = "00000000-0000-0000-0000-000000000001";
const T = "00000000-0000-0000-0000-0000000000f1";

describe("authz-3 storage URLs", () => {
  it("maps legacy public URLs into private buckets to the proxy, leaves the rest alone", () => {
    expect(toProtectedUrl(`${REF}/trip-documents/${U}/${T}/123-passport.pdf`)).toBe(`/api/storage/trip-documents/${U}/${T}/123-passport.pdf`);
    expect(toProtectedUrl(`${REF}/avatars/${U}/me.png`)).toBe(`${REF}/avatars/${U}/me.png`);
    expect(toProtectedUrl("https://booking.com/x")).toBe("https://booking.com/x");
    expect(toProtectedUrl(`/api/storage/trip-documents/${U}/${T}/a.pdf`)).toBe(`/api/storage/trip-documents/${U}/${T}/a.pdf`);
  });
  it("encodes path segments and round-trips through parseStorageUrl", () => {
    const u = protectedFileUrl("trip-documents", `${T}/bookings/1700000000-my file.pdf`);
    expect(u).toBe(`/api/storage/trip-documents/${T}/bookings/1700000000-my%20file.pdf`);
    expect(parseStorageUrl(`${REF}/trip-documents/${T}/bookings/a%20b.pdf`)).toEqual({ bucket: "trip-documents", path: `${T}/bookings/a b.pdf` });
  });
  it("pathGrant mirrors the RLS policy: owner folder, <uid>/<trip>, <trip>/bookings", () => {
    expect(pathGrant(`${U}/${T}/x.pdf`)).toEqual({ ownerId: U, tripIds: [U, T] });
    expect(pathGrant(`${T}/bookings/x.pdf`)).toEqual({ ownerId: T, tripIds: [T] });
    expect(pathGrant(`random/x.pdf`)).toEqual({ ownerId: null, tripIds: [] });
  });
  it("isStoredFileUrl distinguishes uploads from pasted links", () => {
    expect(isStoredFileUrl("/api/storage/trip-documents/a/b.pdf")).toBe(true);
    expect(isStoredFileUrl(`${REF}/trip-documents/a/b.pdf`)).toBe(true);
    expect(isStoredFileUrl("https://airline.com/ticket")).toBe(false);
  });
});

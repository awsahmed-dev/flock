import { describe, it, expect, beforeAll } from "vitest";
import { inboundAddress, parseInboundAddress, verifyInbound } from "@/lib/inbound/address";

const TRIP = "00000000-0000-0000-0000-00000000f001";
describe("forward-the-email address", () => {
  beforeAll(() => { process.env.INBOUND_SECRET = "test-secret"; process.env.INBOUND_DOMAIN = "in.paxawa.com"; });
  it("is derived, parseable and verifiable; wrong mac fails; unconfigured → null", () => {
    const a = inboundAddress(TRIP)!;
    expect(a).toMatch(/^trip-[0-9a-f]{12}-[0-9a-f]{8}@in\.paxawa\.com$/);
    const p = parseInboundAddress(a)!;
    expect(p.short).toBe("000000000000"); expect(verifyInbound(TRIP, p.mac)).toBe(true);
    expect(verifyInbound(TRIP, "deadbeef")).toBe(false);
    expect(parseInboundAddress("hello@in.paxawa.com")).toBeNull();
    delete process.env.INBOUND_SECRET; expect(inboundAddress(TRIP)).toBeNull();
  });
});

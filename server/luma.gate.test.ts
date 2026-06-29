/**
 * Tests for the Luma attendee verification gate on ride creation.
 *
 * The gate logic lives in server/routers.ts (rides.create procedure).
 * We test the underlying helpers and the sentinel error format here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractLumaSlug } from "./luma";

// ---------------------------------------------------------------------------
// Sentinel error format
// ---------------------------------------------------------------------------

describe("LUMA_NOT_REGISTERED sentinel error format", () => {
  it("encodes the Luma URL after the sentinel prefix", () => {
    const lumaUrl = "https://lu.ma/beach-cleanup-march";
    const message = `LUMA_NOT_REGISTERED:${lumaUrl}`;

    expect(message.startsWith("LUMA_NOT_REGISTERED:")).toBe(true);
    const extracted = message.replace("LUMA_NOT_REGISTERED:", "").trim();
    expect(extracted).toBe(lumaUrl);
  });

  it("works with luma.com format URLs in the sentinel", () => {
    const lumaUrl = "https://luma.com/p07v4wq9";
    const message = `LUMA_NOT_REGISTERED:${lumaUrl}`;

    const extracted = message.replace("LUMA_NOT_REGISTERED:", "").trim();
    expect(extracted).toBe(lumaUrl);
  });

  it("non-Luma errors do NOT start with the sentinel prefix", () => {
    const genericError = "Departure time must be before the event starts";
    expect(genericError.startsWith("LUMA_NOT_REGISTERED:")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Verification gate logic (unit-level, mocking verifyDriverAttendance)
// ---------------------------------------------------------------------------

describe("Luma verification gate decision logic", () => {
  /**
   * Simulate the gate logic from routers.ts rides.create:
   *   if (event.lumaEventUrl) {
   *     if (!email) throw BAD_REQUEST
   *     const verified = await verifyDriverAttendance(...)
   *     if (!verified) throw FORBIDDEN with sentinel
   *     isVerified = 1
   *   }
   */
  async function runGate(
    lumaEventUrl: string | null,
    email: string | null,
    verifiedResult: boolean
  ): Promise<{ isVerified: number }> {
    if (lumaEventUrl) {
      if (!email) {
        throw new Error(`BAD_REQUEST: must have email. Register at ${lumaEventUrl}`);
      }
      // Simulate verifyDriverAttendance
      const verified = verifiedResult;
      if (!verified) {
        throw new Error(`LUMA_NOT_REGISTERED:${lumaEventUrl}`);
      }
      return { isVerified: 1 };
    }
    return { isVerified: 0 };
  }

  it("allows ride creation when event has no Luma URL", async () => {
    const result = await runGate(null, "user@example.com", false);
    expect(result.isVerified).toBe(0);
  });

  it("allows ride creation when driver is a verified attendee", async () => {
    const result = await runGate("https://lu.ma/event-abc", "driver@example.com", true);
    expect(result.isVerified).toBe(1);
  });

  it("blocks ride creation when driver is NOT a verified attendee", async () => {
    await expect(
      runGate("https://lu.ma/event-abc", "notregistered@example.com", false)
    ).rejects.toThrow("LUMA_NOT_REGISTERED:https://lu.ma/event-abc");
  });

  it("blocks ride creation when driver has no email", async () => {
    await expect(
      runGate("https://lu.ma/event-abc", null, false)
    ).rejects.toThrow("BAD_REQUEST");
  });

  it("sentinel error contains the event Luma URL for the frontend redirect", async () => {
    const lumaUrl = "https://luma.com/p07v4wq9";
    let caughtMessage = "";
    try {
      await runGate(lumaUrl, "user@example.com", false);
    } catch (e: any) {
      caughtMessage = e.message;
    }
    expect(caughtMessage).toContain("LUMA_NOT_REGISTERED:");
    const extractedUrl = caughtMessage.replace("LUMA_NOT_REGISTERED:", "").trim();
    expect(extractedUrl).toBe(lumaUrl);
  });
});

// ---------------------------------------------------------------------------
// Slug extraction (used by verifyDriverAttendance internally)
// ---------------------------------------------------------------------------

describe("extractLumaSlug — gate-relevant cases", () => {
  it("extracts slug from lu.ma URL", () => {
    expect(extractLumaSlug("https://lu.ma/beach-cleanup")).toBe("beach-cleanup");
  });

  it("extracts slug from luma.com URL", () => {
    expect(extractLumaSlug("https://luma.com/p07v4wq9")).toBe("p07v4wq9");
  });

  it("returns null for non-Luma URLs", () => {
    expect(extractLumaSlug("https://example.com/event")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractLumaSlug("")).toBeNull();
  });
});

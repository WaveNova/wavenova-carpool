import { describe, expect, it } from "vitest";
import { extractLumaSlug } from "./luma";

describe("Luma API helpers", () => {
  describe("extractLumaSlug", () => {
    // ── lu.ma format ──────────────────────────────────────────────────────────
    it("extracts slug from full lu.ma URL", () => {
      expect(extractLumaSlug("https://lu.ma/beach-cleanup-march")).toBe("beach-cleanup-march");
    });

    it("extracts slug from lu.ma URL with query params", () => {
      expect(extractLumaSlug("https://lu.ma/beach-cleanup?ref=share")).toBe("beach-cleanup");
    });

    it("extracts slug from lu.ma URL without https://", () => {
      expect(extractLumaSlug("lu.ma/beach-cleanup")).toBe("beach-cleanup");
    });

    it("extracts slug from lu.ma URL with trailing slash", () => {
      expect(extractLumaSlug("https://lu.ma/beach-cleanup/")).toBe("beach-cleanup");
    });

    it("handles lu.ma URL with www prefix", () => {
      expect(extractLumaSlug("https://www.lu.ma/beach-cleanup")).toBe("beach-cleanup");
    });

    it("extracts short alphanumeric slug from lu.ma URL", () => {
      expect(extractLumaSlug("https://lu.ma/idi9o5pa")).toBe("idi9o5pa");
    });

    // ── luma.com format ───────────────────────────────────────────────────────
    it("extracts slug from luma.com URL", () => {
      expect(extractLumaSlug("https://luma.com/p07v4wq9")).toBe("p07v4wq9");
    });

    it("extracts slug from luma.com URL without https://", () => {
      expect(extractLumaSlug("luma.com/p07v4wq9")).toBe("p07v4wq9");
    });

    it("extracts slug from luma.com URL with query params", () => {
      expect(extractLumaSlug("https://luma.com/p07v4wq9?ref=share")).toBe("p07v4wq9");
    });

    it("extracts slug from luma.com /p/ prefixed URL", () => {
      expect(extractLumaSlug("https://luma.com/p/beach-cleanup-march")).toBe("beach-cleanup-march");
    });

    it("extracts slug from luma.com /e/ prefixed URL", () => {
      expect(extractLumaSlug("https://luma.com/e/beach-cleanup-march")).toBe("beach-cleanup-march");
    });

    it("extracts slug from luma.com /event/ prefixed URL", () => {
      expect(extractLumaSlug("https://luma.com/event/beach-cleanup-march")).toBe("beach-cleanup-march");
    });

    it("handles luma.com URL with www prefix", () => {
      expect(extractLumaSlug("https://www.luma.com/p07v4wq9")).toBe("p07v4wq9");
    });

    // ── edge cases ────────────────────────────────────────────────────────────
    it("returns null for non-luma URLs", () => {
      expect(extractLumaSlug("https://google.com/something")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractLumaSlug("")).toBeNull();
    });

    it("returns null for lu.ma with no slug", () => {
      expect(extractLumaSlug("https://lu.ma/")).toBeNull();
    });

    it("returns null for luma.com with no slug", () => {
      expect(extractLumaSlug("https://luma.com/")).toBeNull();
    });

    it("returns null for luma.com with only a prefix segment and no slug", () => {
      expect(extractLumaSlug("https://luma.com/p/")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Slug matching logic (used internally by lookupLumaEvent via list-events)
// ---------------------------------------------------------------------------

describe("slug matching for list-events lookup", () => {
  /**
   * Simulate the matching logic in lookupLumaEvent:
   * given a list of event URLs from the Luma API, find the one whose slug
   * matches the slug extracted from the user-provided URL.
   */
  function findEventBySlug(
    userUrl: string,
    eventList: Array<{ id: string; name: string; url: string }>
  ) {
    const slug = extractLumaSlug(userUrl);
    if (!slug) return null;
    return eventList.find((ev) => extractLumaSlug(ev.url) === slug) ?? null;
  }

  const mockEvents = [
    { id: "evt-U2U51EhTpTc25rt", name: "Cleanup 0.0", url: "https://luma.com/7s5eup9n" },
    { id: "evt-PfRg4hMtPdJScf8", name: "Cleanup 0.7", url: "https://luma.com/p07v4wq9" },
    { id: "evt-yHM0QUvameptq8L", name: "Cleanup 0.8", url: "https://luma.com/idi9o5pa" },
  ];

  it("matches Cleanup 0.8 from luma.com URL", () => {
    const result = findEventBySlug("https://luma.com/idi9o5pa", mockEvents);
    expect(result?.id).toBe("evt-yHM0QUvameptq8L");
    expect(result?.name).toBe("Cleanup 0.8");
  });

  it("matches Cleanup 0.7 from lu.ma URL", () => {
    const result = findEventBySlug("https://lu.ma/p07v4wq9", mockEvents);
    expect(result?.id).toBe("evt-PfRg4hMtPdJScf8");
    expect(result?.name).toBe("Cleanup 0.7");
  });

  it("matches Cleanup 0.8 from lu.ma URL", () => {
    const result = findEventBySlug("https://lu.ma/idi9o5pa", mockEvents);
    expect(result?.id).toBe("evt-yHM0QUvameptq8L");
  });

  it("returns null for unknown slug", () => {
    const result = findEventBySlug("https://luma.com/unknown-slug", mockEvents);
    expect(result).toBeNull();
  });

  it("returns null for non-Luma URL", () => {
    const result = findEventBySlug("https://example.com/event", mockEvents);
    expect(result).toBeNull();
  });
});

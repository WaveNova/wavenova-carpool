import { describe, expect, it } from "vitest";

describe("LUMA_API_KEY validation", () => {
  it("should have LUMA_API_KEY environment variable set", () => {
    const key = process.env.LUMA_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it("should authenticate with the Luma API", async () => {
    const key = process.env.LUMA_API_KEY;
    if (!key) {
      console.warn("LUMA_API_KEY not set, skipping API test");
      return;
    }

    const response = await fetch("https://public-api.luma.com/v1/user/get-self", {
      headers: {
        "x-luma-api-key": key,
        "accept": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
  });
});

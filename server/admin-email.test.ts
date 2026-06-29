import { describe, expect, it } from "vitest";

describe("ADMIN_EMAIL environment variable", () => {
  it("should be set to hi@wavenova.org", () => {
    // The ADMIN_EMAIL env var is injected by the platform
    const adminEmail = process.env.ADMIN_EMAIL;
    expect(adminEmail).toBe("hi@wavenova.org");
  });
});

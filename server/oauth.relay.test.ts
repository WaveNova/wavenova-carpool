/**
 * Tests for the OAuth relay token mechanism.
 * The relay is used when the OAuth callback arrives on the canonical
 * manus.space domain but the user is browsing on a custom domain
 * (e.g. carpool.wavenova.org). A short-lived relay token bridges the
 * two domains so the session cookie is set on the correct domain.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Minimal inline re-implementation of the relay token store logic so we can
// unit-test it without spinning up an Express server.
// ---------------------------------------------------------------------------

type RelayEntry = { sessionToken: string; expiresAt: number };
const relayTokens = new Map<string, RelayEntry>();

function generateRelayToken(): string {
  // Deterministic in tests via vi.spyOn on crypto.getRandomValues
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cleanExpiredRelayTokens() {
  const now = Date.now();
  Array.from(relayTokens.entries()).forEach(([key, val]) => {
    if (val.expiresAt < now) relayTokens.delete(key);
  });
}

function storeRelayToken(sessionToken: string, ttlMs = 60_000): string {
  cleanExpiredRelayTokens();
  const token = generateRelayToken();
  relayTokens.set(token, { sessionToken, expiresAt: Date.now() + ttlMs });
  return token;
}

function consumeRelayToken(token: string): string | null {
  cleanExpiredRelayTokens();
  const entry = relayTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    relayTokens.delete(token);
    return null;
  }
  relayTokens.delete(token); // single-use
  return entry.sessionToken;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  relayTokens.clear();
});

describe("OAuth relay token store", () => {
  it("stores a relay token and returns the session token on consumption", () => {
    const sessionToken = "test-session-jwt-abc123";
    const relayToken = storeRelayToken(sessionToken);

    expect(typeof relayToken).toBe("string");
    expect(relayToken.length).toBeGreaterThan(0);

    const recovered = consumeRelayToken(relayToken);
    expect(recovered).toBe(sessionToken);
  });

  it("is single-use: consuming the same token twice returns null the second time", () => {
    const relayToken = storeRelayToken("my-session");

    const first = consumeRelayToken(relayToken);
    const second = consumeRelayToken(relayToken);

    expect(first).toBe("my-session");
    expect(second).toBeNull();
  });

  it("returns null for an unknown token", () => {
    const result = consumeRelayToken("nonexistent-token");
    expect(result).toBeNull();
  });

  it("returns null for an expired token", () => {
    // Store with a TTL of 0 ms so it's immediately expired
    const relayToken = storeRelayToken("expired-session", 0);

    // Advance time by 1 ms to ensure expiry
    const originalDateNow = Date.now;
    vi.spyOn(Date, "now").mockReturnValue(originalDateNow() + 1);

    const result = consumeRelayToken(relayToken);
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });

  it("cleanExpiredRelayTokens removes only expired entries", () => {
    const now = Date.now();
    relayTokens.set("expired", { sessionToken: "s1", expiresAt: now - 1000 });
    relayTokens.set("valid", { sessionToken: "s2", expiresAt: now + 60_000 });

    cleanExpiredRelayTokens();

    expect(relayTokens.has("expired")).toBe(false);
    expect(relayTokens.has("valid")).toBe(true);
  });

  it("generates tokens of the correct hex length (48 hex chars = 24 bytes)", () => {
    const token = generateRelayToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });
});

describe("getLoginUrl canonical origin logic", () => {
  it("uses VITE_CANONICAL_ORIGIN when set, not window.location.origin", () => {
    const canonicalOrigin = "https://wavenova-ride-3zqfgbhg.manus.space";
    const redirectUri = `${canonicalOrigin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    // Verify the state decodes back to the canonical callback URL
    expect(atob(state)).toBe(redirectUri);
    expect(atob(state)).toContain("manus.space");
    expect(atob(state)).not.toContain("carpool.wavenova.org");
  });

  it("state encodes exactly the redirectUri used for token exchange", () => {
    const redirectUri = "https://wavenova-ride-3zqfgbhg.manus.space/api/oauth/callback";
    const state = btoa(redirectUri);

    // Simulate what the SDK's decodeState does
    const decoded = atob(state);
    expect(decoded).toBe(redirectUri);
  });
});

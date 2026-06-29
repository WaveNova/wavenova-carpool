/**
 * Luma API helper — verify event attendees for driver verification.
 *
 * Luma API docs: https://docs.luma.com/reference
 * Base URL: https://public-api.luma.com
 * Auth: x-luma-api-key header
 */

const LUMA_BASE_URL = "https://public-api.luma.com";

function getApiKey(): string {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error("LUMA_API_KEY is not configured");
  return key;
}

function lumaHeaders() {
  return {
    "x-luma-api-key": getApiKey(),
    "accept": "application/json",
  };
}

/**
 * Extract the Luma event slug from a Luma URL.
 * Supports formats like:
 *   https://lu.ma/EVENT_SLUG          (short domain)
 *   https://lu.ma/EVENT_SLUG?params
 *   lu.ma/EVENT_SLUG
 *   https://luma.com/EVENT_SLUG       (full domain)
 *   https://luma.com/p/EVENT_SLUG     (luma.com /p/ prefix)
 *   luma.com/EVENT_SLUG
 */
export function extractLumaSlug(url: string): string | null {
  try {
    // Normalize: add https:// if missing
    let normalized = url.trim();
    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();

    // Accept both lu.ma and luma.com (including www. variants)
    const isLuMa = host === "lu.ma" || host === "www.lu.ma";
    const isLumaCom = host === "luma.com" || host === "www.luma.com";
    if (!isLuMa && !isLumaCom) return null;

    // Strip leading slash and split path segments
    const segments = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length === 0) return null;

    // luma.com sometimes uses /p/SLUG or /e/SLUG prefixes — skip them
    const prefixes = new Set(["p", "e", "event"]);
    const slug = prefixes.has(segments[0]) ? segments[1] : segments[0];
    return slug || null;
  } catch {
    return null;
  }
}

/**
 * Look up a Luma event by its URL to get the event API ID (evt-xxx).
 * Strategy:
 *   1. List all calendar events and match by URL slug — most reliable.
 *   2. The Luma public API uses `event_api_id` (e.g. evt-xxx) as the key,
 *      NOT the human-readable slug from the URL.
 */
export async function lookupLumaEvent(lumaUrl: string): Promise<{ apiId: string; name: string } | null> {
  try {
    const slug = extractLumaSlug(lumaUrl);
    if (!slug) return null;

    // List all calendar events and find the one whose URL matches the slug.
    // The Luma list-events endpoint returns the luma.com URL for each event.
    const response = await fetch(`${LUMA_BASE_URL}/v1/calendar/list-events?pagination_limit=100`, {
      headers: lumaHeaders(),
    });

    if (!response.ok) {
      console.error("[Luma] Failed to list calendar events:", response.status);
      return null;
    }

    const data = await response.json();
    const entries: Array<{ api_id: string; event: { id: string; name: string; url: string } }> = data?.entries ?? [];

    // Match by slug — the event URL ends with the slug (e.g. https://luma.com/p07v4wq9)
    const match = entries.find((entry) => {
      const eventUrl = entry.event?.url ?? "";
      const eventSlug = extractLumaSlug(eventUrl);
      return eventSlug === slug;
    });

    if (match) {
      return {
        apiId: match.event.id,
        name: match.event.name || "",
      };
    }

    console.warn(`[Luma] No calendar event found matching slug: ${slug}`);
    return null;
  } catch (error) {
    console.error("[Luma] Failed to lookup event:", error);
    return null;
  }
}

/**
 * Check if a specific email is a registered guest for a Luma event.
 * Uses the Get Guest endpoint with email as the id parameter.
 */
export async function verifyLumaAttendee(
  eventApiId: string,
  email: string
): Promise<{ verified: boolean; status?: string; name?: string }> {
  try {
    const params = new URLSearchParams({
      event_api_id: eventApiId,
      email: email,
    });

    const response = await fetch(`${LUMA_BASE_URL}/v1/event/get-guest?${params}`, {
      headers: lumaHeaders(),
    });

    if (!response.ok) {
      // 404 or other error means guest not found
      return { verified: false };
    }

    const data = await response.json();
    const guest = data?.guest;

    if (!guest) return { verified: false };

    // Guest is verified if their approval status is "approved"
    const isApproved = guest.approval_status === "approved";
    return {
      verified: isApproved,
      status: guest.approval_status,
      name: guest.name,
    };
  } catch (error) {
    console.error("[Luma] Failed to verify attendee:", error);
    return { verified: false };
  }
}

/**
 * Full verification flow: given a Luma event URL and a driver email,
 * check if the driver is a verified attendee.
 */
export async function verifyDriverAttendance(
  lumaEventUrl: string,
  driverEmail: string
): Promise<boolean> {
  try {
    const event = await lookupLumaEvent(lumaEventUrl);
    if (!event) {
      console.warn("[Luma] Could not resolve event URL:", lumaEventUrl);
      return false;
    }

    const result = await verifyLumaAttendee(event.apiId, driverEmail);
    console.log(`[Luma] Verification for ${driverEmail} on event ${event.apiId}: ${result.verified} (status: ${result.status})`);
    return result.verified;
  } catch (error) {
    console.error("[Luma] Driver verification failed:", error);
    return false;
  }
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  cancelEvent: vi.fn(),
  deleteEvent: vi.fn(),
  updateEvent: vi.fn(),
  createEvent: vi.fn(),
  listEvents: vi.fn(),
  listUpcomingEvents: vi.fn(),
  getEventById: vi.fn(),
  createRide: vi.fn(),
  listActiveRides: vi.fn(),
  getRideById: vi.fn(),
  joinRide: vi.fn(),
  leaveRide: vi.fn(),
  cancelRide: vi.fn(),
  getUserRides: vi.fn(),
  getRidePassengers: vi.fn(),
  getRideDriverInfo: vi.fn(),
  getUserById: vi.fn(),
  sendChatMessage: vi.fn(),
  getChatMessages: vi.fn(),
  isUserInRide: vi.fn(),
}));

vi.mock("./luma", () => ({
  verifyDriverAttendance: vi.fn(),
  lookupLumaEvent: vi.fn(),
  verifyLumaAttendee: vi.fn(),
  extractLumaSlug: vi.fn(),
}));

vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("nanoid", () => ({ nanoid: () => "test-id" }));

import { getRideById as mockedGetRideById, joinRide as mockedJoinRide, getRideDriverInfo as mockedGetRideDriverInfo } from "./db";
import { verifyDriverAttendance as mockedVerify } from "./luma";

const getRideByIdFn = vi.mocked(mockedGetRideById);
const joinRideFn = vi.mocked(mockedJoinRide);
const getDriverInfoFn = vi.mocked(mockedGetRideDriverInfo);
const verifyFn = vi.mocked(mockedVerify);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPassengerContext(email = "passenger@example.com"): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "passenger-open-id",
      name: "Passenger User",
      email,
      role: "user",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as AuthenticatedUser,
  };
}

const mockRideWithLuma = {
  id: 10,
  eventId: 1,
  driverId: 5,
  departureLocation: "Taipei Main Station",
  departureTime: Date.now() + 3600000,
  totalSeats: 4,
  notes: null,
  departureLat: null,
  departureLng: null,
  isVerifiedAttendee: 1,
  status: "active" as const,
  createdAt: new Date(),
  driverName: "Driver",
  driverEmail: "driver@example.com",
  eventTitle: "Cleanup 0.8",
  eventLumaUrl: "https://lu.ma/abc123",
  seatsOccupied: 1,
  seatsRemaining: 3,
};

const mockRideWithoutLuma = {
  ...mockRideWithLuma,
  id: 11,
  eventLumaUrl: null,
};

describe("rides.join — passenger Luma verification gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinRideFn.mockResolvedValue({ success: true });
    getDriverInfoFn.mockResolvedValue(null);
  });

  it("allows joining a ride with no Luma URL without verification", async () => {
    getRideByIdFn.mockResolvedValue(mockRideWithoutLuma);
    const ctx = createPassengerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.join({ rideId: 11 });
    expect(result.success).toBe(true);
    expect(verifyFn).not.toHaveBeenCalled();
  });

  it("allows joining when passenger is a verified Luma attendee", async () => {
    getRideByIdFn.mockResolvedValue(mockRideWithLuma);
    verifyFn.mockResolvedValue(true);
    const ctx = createPassengerContext("passenger@example.com");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.join({ rideId: 10 });
    expect(result.success).toBe(true);
    expect(verifyFn).toHaveBeenCalledWith("https://lu.ma/abc123", "passenger@example.com");
  });

  it("blocks joining when passenger is NOT a verified Luma attendee", async () => {
    getRideByIdFn.mockResolvedValue(mockRideWithLuma);
    verifyFn.mockResolvedValue(false);
    const ctx = createPassengerContext("unregistered@example.com");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rides.join({ rideId: 10 })).rejects.toThrow("LUMA_NOT_REGISTERED:");
    expect(joinRideFn).not.toHaveBeenCalled();
  });

  it("blocks joining when passenger has no email", async () => {
    getRideByIdFn.mockResolvedValue(mockRideWithLuma);
    const ctx = createPassengerContext(undefined as unknown as string);
    // Override email to null
    (ctx.user as AuthenticatedUser).email = null;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rides.join({ rideId: 10 })).rejects.toThrow();
    expect(joinRideFn).not.toHaveBeenCalled();
  });

  it("error message contains the Luma event URL", async () => {
    getRideByIdFn.mockResolvedValue(mockRideWithLuma);
    verifyFn.mockResolvedValue(false);
    const ctx = createPassengerContext("unregistered@example.com");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.rides.join({ rideId: 10 });
    } catch (err: unknown) {
      expect((err as Error).message).toContain("https://lu.ma/abc123");
    }
  });
});

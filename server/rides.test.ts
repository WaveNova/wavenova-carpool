import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module — must include ALL exports used by routers.ts
vi.mock("./db", () => ({
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
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  listEvents: vi.fn(),
  listUpcomingEvents: vi.fn(),
  getEventById: vi.fn(),
  sendChatMessage: vi.fn(),
  getChatMessages: vi.fn(),
  isUserInRide: vi.fn(),
}));

// Mock luma module
vi.mock("./luma", () => ({
  verifyDriverAttendance: vi.fn().mockResolvedValue(false),
  lookupLumaEvent: vi.fn(),
  verifyLumaAttendee: vi.fn(),
  extractLumaSlug: vi.fn(),
}));

import {
  createRide,
  listActiveRides,
  getRideById,
  joinRide,
  leaveRide,
  cancelRide,
  getUserRides,
  getRidePassengers,
  getRideDriverInfo,
  getEventById,
} from "./db";

const mockedCreateRide = vi.mocked(createRide);
const mockedListActiveRides = vi.mocked(listActiveRides);
const mockedGetRideById = vi.mocked(getRideById);
const mockedJoinRide = vi.mocked(joinRide);
const mockedLeaveRide = vi.mocked(leaveRide);
const mockedCancelRide = vi.mocked(cancelRide);
const mockedGetUserRides = vi.mocked(getUserRides);
const mockedGetRidePassengers = vi.mocked(getRidePassengers);
const mockedGetRideDriverInfo = vi.mocked(getRideDriverInfo);
const mockedGetEventById = vi.mocked(getEventById);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rides.list", () => {
  it("returns a list of active rides (public access)", async () => {
    const mockRides = [
      {
        id: 1,
        driverId: 2,
        departureLocation: "Downtown Library",
        departureTime: Date.now() + 86400000,
        totalSeats: 4,
        notes: null,
        status: "active" as const,
        createdAt: new Date(),
        driverName: "Jane Driver",
        driverEmail: "jane@example.com",
        seatsOccupied: 1,
        seatsRemaining: 3,
      },
    ];
    mockedListActiveRides.mockResolvedValue(mockRides);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.list();

    expect(result).toEqual(mockRides);
    expect(mockedListActiveRides).toHaveBeenCalledOnce();
  });
});

describe("rides.getById", () => {
  it("returns a single ride by ID", async () => {
    const mockRide = {
      id: 1,
      driverId: 2,
      departureLocation: "Central Park",
      departureTime: Date.now() + 86400000,
      totalSeats: 3,
      notes: "Blue SUV",
      status: "active" as const,
      createdAt: new Date(),
      driverName: "Jane",
      driverEmail: "jane@example.com",
      seatsOccupied: 0,
      seatsRemaining: 3,
    };
    mockedGetRideById.mockResolvedValue(mockRide);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.getById({ id: 1 });

    expect(result).toEqual(mockRide);
    expect(mockedGetRideById).toHaveBeenCalledWith(1);
  });
});

describe("rides.create", () => {
  const futureEventTime = Date.now() + 86400000 * 2; // 2 days from now
  const futureRideTime = Date.now() + 86400000; // 1 day from now (before event)

  it("creates a ride with a required eventId", async () => {
    const mockEvent = {
      id: 1,
      title: "Beach Cleanup",
      location: "Malibu Beach",
      eventDate: futureEventTime,
      description: null,
      status: "upcoming" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetEventById.mockResolvedValue(mockEvent);

    const mockCreated = {
      id: 10,
      driverId: 1,
      eventId: 1,
      departureLocation: "Beach Parking Lot A",
      departureTime: futureRideTime,
      totalSeats: 4,
      notes: null,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedCreateRide.mockResolvedValue(mockCreated);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.create({
      eventId: 1,
      departureLocation: "Beach Parking Lot A",
      departureTime: futureRideTime,
      totalSeats: 4,
    });

    expect(result).toEqual(mockCreated);
    expect(mockedGetEventById).toHaveBeenCalledWith(1);
    expect(mockedCreateRide).toHaveBeenCalledWith({
      eventId: 1,
      driverId: 1,
      departureLocation: "Beach Parking Lot A",
      departureTime: futureRideTime,
      totalSeats: 4,
      notes: null,
      status: "active",
      departureLat: null,
      departureLng: null,
      isVerifiedAttendee: 0,
    });
  });

  it("rejects ride creation without eventId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rides.create({
        departureLocation: "Test",
        departureTime: futureRideTime,
        totalSeats: 2,
      } as any)
    ).rejects.toThrow();
  });

  it("rejects departure time that is after event start time", async () => {
    const mockEvent = {
      id: 1,
      title: "Beach Cleanup",
      location: "Malibu Beach",
      eventDate: futureRideTime, // event is at futureRideTime
      description: null,
      status: "upcoming" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetEventById.mockResolvedValue(mockEvent);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Departure time AFTER event start — should be rejected
    await expect(
      caller.rides.create({
        eventId: 1,
        departureLocation: "Test Location",
        departureTime: futureRideTime + 3600000, // 1 hour after event
        totalSeats: 3,
      })
    ).rejects.toThrow("Departure time must be before the event starts");
  });

  it("rejects departure time equal to event start time", async () => {
    const mockEvent = {
      id: 1,
      title: "Beach Cleanup",
      location: "Malibu Beach",
      eventDate: futureEventTime,
      description: null,
      status: "upcoming" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetEventById.mockResolvedValue(mockEvent);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Departure time EQUAL to event start — should be rejected
    await expect(
      caller.rides.create({
        eventId: 1,
        departureLocation: "Test Location",
        departureTime: futureEventTime,
        totalSeats: 3,
      })
    ).rejects.toThrow("Departure time must be before the event starts");
  });

  it("rejects ride for non-existent event", async () => {
    mockedGetEventById.mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rides.create({
        eventId: 999,
        departureLocation: "Test Location",
        departureTime: futureRideTime,
        totalSeats: 3,
      })
    ).rejects.toThrow("Selected event not found");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rides.create({
        eventId: 1,
        departureLocation: "Test",
        departureTime: Date.now() + 86400000,
        totalSeats: 2,
      })
    ).rejects.toThrow();
  });

  it("validates departure location is not empty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rides.create({
        eventId: 1,
        departureLocation: "",
        departureTime: Date.now() + 86400000,
        totalSeats: 2,
      })
    ).rejects.toThrow();
  });

  it("validates seats are within range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rides.create({
        eventId: 1,
        departureLocation: "Test Location",
        departureTime: Date.now() + 86400000,
        totalSeats: 25,
      })
    ).rejects.toThrow();
  });
});

describe("rides.join", () => {
  it("allows an authenticated user to join a ride", async () => {
    mockedJoinRide.mockResolvedValue({ success: true });
    mockedGetRideDriverInfo.mockResolvedValue({
      departureLocation: "Test Beach",
      driverName: "Driver",
      driverEmail: "driver@test.com",
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.join({ rideId: 5 });

    expect(result).toEqual({ success: true });
    expect(mockedJoinRide).toHaveBeenCalledWith(5, 1);
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.rides.join({ rideId: 5 })).rejects.toThrow();
  });
});

describe("rides.leave", () => {
  it("allows an authenticated user to leave a ride", async () => {
    mockedLeaveRide.mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.leave({ rideId: 5 });

    expect(result).toEqual({ success: true });
    expect(mockedLeaveRide).toHaveBeenCalledWith(5, 1);
  });
});

describe("rides.cancel", () => {
  it("allows the driver to cancel their ride", async () => {
    mockedCancelRide.mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.cancel({ rideId: 3 });

    expect(result).toEqual({ success: true });
    expect(mockedCancelRide).toHaveBeenCalledWith(3, 1);
  });
});

describe("rides.myRides", () => {
  it("returns user rides (driver + passenger)", async () => {
    const mockData = {
      driverRides: [
        {
          id: 1,
          driverId: 1,
          departureLocation: "Library",
          departureTime: Date.now() + 86400000,
          totalSeats: 4,
          notes: null,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          seatsOccupied: 2,
          seatsRemaining: 2,
        },
      ],
      passengerRides: [],
    };
    mockedGetUserRides.mockResolvedValue(mockData);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.myRides();

    expect(result).toEqual(mockData);
    expect(mockedGetUserRides).toHaveBeenCalledWith(1);
  });
});

describe("rides.passengers", () => {
  it("returns passengers for a ride", async () => {
    const mockPassengers = [
      {
        requestId: 1,
        passengerId: 2,
        passengerName: "Bob",
        passengerEmail: "bob@example.com",
        joinedAt: new Date(),
      },
    ];
    mockedGetRidePassengers.mockResolvedValue(mockPassengers);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rides.passengers({ rideId: 1 });

    expect(result).toEqual(mockPassengers);
    expect(mockedGetRidePassengers).toHaveBeenCalledWith(1);
  });
});

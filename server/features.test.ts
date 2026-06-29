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

// Mock storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test.jpg" }),
  storageGet: vi.fn(),
}));

import {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  listUpcomingEvents,
  getEventById,
  sendChatMessage,
  getChatMessages,
  isUserInRide,
  createRide,
  listActiveRides,
} from "./db";

const mockedCreateEvent = vi.mocked(createEvent);
const mockedUpdateEvent = vi.mocked(updateEvent);
const mockedDeleteEvent = vi.mocked(deleteEvent);
const mockedListEvents = vi.mocked(listEvents);
const mockedListUpcomingEvents = vi.mocked(listUpcomingEvents);
const mockedGetEventById = vi.mocked(getEventById);
const mockedSendChatMessage = vi.mocked(sendChatMessage);
const mockedGetChatMessages = vi.mocked(getChatMessages);
const mockedIsUserInRide = vi.mocked(isUserInRide);
const mockedCreateRide = vi.mocked(createRide);
const mockedListActiveRides = vi.mocked(listActiveRides);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminUser(): AuthenticatedUser {
  return {
    id: 1,
    openId: "admin-user",
    email: "admin@wavenova.org",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function createRegularUser(id = 2): AuthenticatedUser {
  return {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("events router", () => {
  it("events.list returns mocked array", async () => {
    mockedListEvents.mockResolvedValue([]);
    const ctx = createMockContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.list();
    expect(Array.isArray(result)).toBe(true);
    expect(mockedListEvents).toHaveBeenCalledOnce();
  });

  it("events.upcoming returns mocked array", async () => {
    mockedListUpcomingEvents.mockResolvedValue([]);
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.upcoming();
    expect(Array.isArray(result)).toBe(true);
    expect(mockedListUpcomingEvents).toHaveBeenCalledOnce();
  });

  it("events.create requires admin role", async () => {
    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.events.create({
        title: "Test Event",
        location: "Test Beach",
        eventDate: Date.now() + 86400000,
      })
    ).rejects.toThrow();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("events.create works for admin", async () => {
    const mockEvent = {
      id: 1,
      title: "March Beach Cleanup",
      description: "Monthly cleanup event",
      location: "Malibu Beach, CA",
      eventDate: Date.now() + 86400000 * 30,
      status: "upcoming" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedCreateEvent.mockResolvedValue(mockEvent);

    const ctx = createMockContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    const event = await caller.events.create({
      title: "March Beach Cleanup",
      location: "Malibu Beach, CA",
      eventDate: Date.now() + 86400000 * 30,
      description: "Monthly cleanup event",
    });

    expect(event).toBeDefined();
    expect(event.title).toBe("March Beach Cleanup");
    expect(event.location).toBe("Malibu Beach, CA");
    expect(mockedCreateEvent).toHaveBeenCalledOnce();
  });

  it("events.update works for admin", async () => {
    const mockUpdated = {
      id: 1,
      title: "Updated Title",
      description: null,
      location: "Test Beach",
      eventDate: Date.now() + 86400000 * 30,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedUpdateEvent.mockResolvedValue(mockUpdated);

    const ctx = createMockContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    const updated = await caller.events.update({
      id: 1,
      title: "Updated Title",
      status: "active",
    });

    expect(updated).toBeDefined();
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.status).toBe("active");
    expect(mockedUpdateEvent).toHaveBeenCalledOnce();
  });

  it("events.delete works for admin", async () => {
    mockedDeleteEvent.mockResolvedValue({ success: true });

    const ctx = createMockContext(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.delete({ id: 1 });

    expect(result.success).toBe(true);
    expect(mockedDeleteEvent).toHaveBeenCalledWith(1);
  });

  it("events.getById returns the event", async () => {
    const mockEvent = {
      id: 5,
      title: "GetById Test",
      description: null,
      location: "Test Beach",
      eventDate: Date.now() + 86400000 * 30,
      status: "upcoming" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetEventById.mockResolvedValue(mockEvent);

    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    const fetched = await caller.events.getById({ id: 5 });

    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("GetById Test");
    expect(mockedGetEventById).toHaveBeenCalledWith(5);
  });
});

describe("rides with events", () => {
  it("rides.create with eventId links ride to event", async () => {
    const futureTime = Date.now() + 86400000;
    const mockRide = {
      id: 10,
      driverId: 2,
      eventId: 1,
      departureLocation: "Downtown",
      departureTime: futureTime,
      totalSeats: 4,
      notes: null,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedCreateRide.mockResolvedValue(mockRide);

    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    const ride = await caller.rides.create({
      eventId: 1,
      departureLocation: "Downtown",
      departureTime: futureTime,
      totalSeats: 4,
    });

    expect(ride).toBeDefined();
    expect(ride.eventId).toBe(1);
    expect(mockedCreateRide).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 1 })
    );
  });

  it("rides.list can filter by eventId", async () => {
    const mockRides = [
      {
        id: 1,
        driverId: 2,
        eventId: 3,
        departureLocation: "Location A",
        departureTime: Date.now() + 86400000,
        totalSeats: 3,
        notes: null,
        status: "active" as const,
        createdAt: new Date(),
        driverName: "Driver",
        driverEmail: "driver@test.com",
        seatsOccupied: 0,
        seatsRemaining: 3,
      },
    ];
    mockedListActiveRides.mockResolvedValue(mockRides);

    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    const rides = await caller.rides.list({ eventId: 3 });

    expect(Array.isArray(rides)).toBe(true);
    expect(rides.length).toBe(1);
    expect(mockedListActiveRides).toHaveBeenCalledWith(3);
  });
});

describe("chat router", () => {
  it("chat.messages rejects users not in ride", async () => {
    mockedIsUserInRide.mockResolvedValue(false);

    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.chat.messages({ rideId: 1 })).rejects.toThrow(
      "You must be part of this ride"
    );
  });

  it("chat.messages returns messages for ride members", async () => {
    mockedIsUserInRide.mockResolvedValue(true);
    const mockMessages = [
      {
        id: 1,
        rideId: 1,
        userId: 2,
        message: "Hello!",
        createdAt: new Date(),
        userName: "User 2",
      },
    ];
    mockedGetChatMessages.mockResolvedValue(mockMessages);

    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    const messages = await caller.chat.messages({ rideId: 1 });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(1);
    expect(messages[0].message).toBe("Hello!");
  });

  it("chat.send rejects users not in ride", async () => {
    mockedIsUserInRide.mockResolvedValue(false);

    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.chat.send({ rideId: 1, message: "Hello" })
    ).rejects.toThrow("You must be part of this ride");
  });

  it("chat.send works for ride members", async () => {
    mockedIsUserInRide.mockResolvedValue(true);
    const mockMsg = {
      id: 5,
      rideId: 1,
      userId: 2,
      message: "Hello everyone!",
      createdAt: new Date(),
      userName: "User 2",
    };
    mockedSendChatMessage.mockResolvedValue(mockMsg);

    const ctx = createMockContext(createRegularUser());
    const caller = appRouter.createCaller(ctx);
    const msg = await caller.chat.send({ rideId: 1, message: "Hello everyone!" });

    expect(msg).toBeDefined();
    expect(msg.message).toBe("Hello everyone!");
    expect(msg.userName).toBe("User 2");
    expect(mockedSendChatMessage).toHaveBeenCalledWith({
      rideId: 1,
      userId: 2,
      message: "Hello everyone!",
    });
  });

  it("chat.send rejects unauthenticated users", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.chat.send({ rideId: 1, message: "Hello" })
    ).rejects.toThrow();
  });
});

describe("auth router", () => {
  it("auth.me returns null for unauthenticated", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated", async () => {
    const user = createRegularUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result!.email).toBe(user.email);
  });
});

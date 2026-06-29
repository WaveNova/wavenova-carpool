import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
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
  verifyDriverAttendance: vi.fn().mockResolvedValue(true),
  lookupLumaEvent: vi.fn(),
  verifyLumaAttendee: vi.fn(),
  extractLumaSlug: vi.fn(),
}));

vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("nanoid", () => ({ nanoid: () => "test-id" }));

import { cancelEvent as mockedCancelEvent } from "./db";
const mockedCancelEventFn = vi.mocked(mockedCancelEvent);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as AuthenticatedUser,
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-open-id",
      name: "Regular User",
      email: "user@example.com",
      role: "user",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as AuthenticatedUser,
  };
}

describe("events.cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to cancel an event", async () => {
    const mockCancelledEvent = {
      id: 5,
      title: "Cleanup 0.8",
      status: "cancelled" as const,
      location: "Beach",
      eventDate: Date.now() + 86400000,
      description: null,
      coverImage: null,
      lumaEventUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedCancelEventFn.mockResolvedValue(mockCancelledEvent);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.cancel({ id: 5 });

    expect(result.status).toBe("cancelled");
    expect(mockedCancelEventFn).toHaveBeenCalledWith(5);
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.cancel({ id: 5 })).rejects.toThrow();
    expect(mockedCancelEventFn).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    const ctx: TrpcContext = { user: null };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.cancel({ id: 5 })).rejects.toThrow();
    expect(mockedCancelEventFn).not.toHaveBeenCalled();
  });

  it("propagates error when event is already cancelled", async () => {
    mockedCancelEventFn.mockRejectedValue(new Error("Event is already cancelled"));

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.cancel({ id: 5 })).rejects.toThrow("Event is already cancelled");
  });

  it("propagates error when event is not found", async () => {
    mockedCancelEventFn.mockRejectedValue(new Error("Event not found"));

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.cancel({ id: 999 })).rejects.toThrow("Event not found");
  });
});

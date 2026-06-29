import { eq, and, sql, desc, asc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import {
  InsertUser, users,
  rides, rideRequests,
  events, chatMessages,
  type InsertRide, type InsertEvent, type InsertChatMessage,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const rawUrl = process.env.DATABASE_URL;
      const baseUrl = rawUrl.includes("?") ? rawUrl.slice(0, rawUrl.indexOf("?")) : rawUrl;
      const parsed = new URL(baseUrl.replace(/^mysql:\/\//, "http://"));
      const pool = mysql.createPool({
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port) : 4000,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1),
        ssl: { rejectUnauthorized: true },
        waitForConnections: true,
        connectionLimit: 3,
        maxIdle: 3,
        idleTimeout: 60000,
        connectTimeout: 10000,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || (user.email && ENV.adminEmail && user.email === ENV.adminEmail)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Event helpers ─────────────────────────────────────────────

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(events).values(data);
  const insertId = result[0].insertId;
  const rows = await db.select().from(events).where(eq(events.id, insertId)).limit(1);
  return rows[0];
}

export async function updateEvent(id: number, data: Partial<Pick<InsertEvent, "title" | "description" | "location" | "eventDate" | "status" | "coverImage" | "lumaEventUrl">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(events).set(data).where(eq(events.id, id));
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0];
}

/**
 * Cancel an event: sets its status to "cancelled" and bulk-cancels all
 * active rides for that event. Ride history is preserved.
 */
export async function cancelEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const event = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (event.length === 0) throw new Error("Event not found");
  if (event[0].status === "cancelled") throw new Error("Event is already cancelled");

  // Bulk-cancel all active rides for this event
  await db
    .update(rides)
    .set({ status: "cancelled" })
    .where(and(eq(rides.eventId, id), eq(rides.status, "active")));

  // Mark the event itself as cancelled
  await db.update(events).set({ status: "cancelled" }).where(eq(events.id, id));
  const updated = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return updated[0];
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Only block deletion if there are still ACTIVE rides — cancelled rides are fine
  const activeRides = await db
    .select({ id: rides.id })
    .from(rides)
    .where(and(eq(rides.eventId, id), eq(rides.status, "active")))
    .limit(1);
  if (activeRides.length > 0) {
    throw new Error("Cannot delete event with active rides. Cancel all rides first.");
  }

  await db.delete(events).where(eq(events.id, id));
  return { success: true };
}

export async function listEvents() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const eventRows = await db.select().from(events).orderBy(desc(events.eventDate));

  // Get ride counts per event
  const eventIds = eventRows.map(e => e.id);
  if (eventIds.length === 0) return eventRows.map(e => ({ ...e, rideCount: 0, passengerCount: 0 }));

  const rideCounts = await db
    .select({
      eventId: rides.eventId,
      rideCount: sql<number>`COUNT(DISTINCT ${rides.id})`.as("rideCount"),
    })
    .from(rides)
    .where(and(
      eq(rides.status, "active"),
      sql`${rides.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
    ))
    .groupBy(rides.eventId);

  const rideCountMap = new Map(rideCounts.map(r => [r.eventId, r.rideCount]));

  return eventRows.map(e => ({
    ...e,
    rideCount: rideCountMap.get(e.id) ?? 0,
  }));
}

export async function listUpcomingEvents() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(events)
    .where(sql`${events.status} IN ('upcoming', 'active')`)
    .orderBy(asc(events.eventDate));
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

// ─── Ride helpers ───────────────────────────────────────────────

export async function createRide(data: InsertRide) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(rides).values(data);
  const insertId = result[0].insertId;
  const rows = await db.select().from(rides).where(eq(rides.id, insertId)).limit(1);
  return rows[0];
}

export async function listActiveRides(eventId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(rides.status, "active")];
  if (eventId !== undefined) {
    conditions.push(eq(rides.eventId, eventId));
  }

  const rideRows = await db
    .select({
      id: rides.id,
      eventId: rides.eventId,
      driverId: rides.driverId,
      departureLocation: rides.departureLocation,
      departureTime: rides.departureTime,
      totalSeats: rides.totalSeats,
      notes: rides.notes,
      departureLat: rides.departureLat,
      departureLng: rides.departureLng,
      isVerifiedAttendee: rides.isVerifiedAttendee,
      status: rides.status,
      createdAt: rides.createdAt,
      driverName: users.name,
      driverEmail: users.email,
      eventTitle: events.title,
      eventLumaUrl: events.lumaEventUrl,
    })
    .from(rides)
    .innerJoin(users, eq(rides.driverId, users.id))
    .leftJoin(events, eq(rides.eventId, events.id))
    .where(and(...conditions))
    .orderBy(rides.departureTime);

  const rideIds = rideRows.map(r => r.id);
  if (rideIds.length === 0) return [];

  const passengerCounts = await db
    .select({
      rideId: rideRequests.rideId,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(rideRequests)
    .where(and(
      eq(rideRequests.status, "confirmed"),
      sql`${rideRequests.rideId} IN (${sql.join(rideIds.map(id => sql`${id}`), sql`, `)})`
    ))
    .groupBy(rideRequests.rideId);

  const countMap = new Map(passengerCounts.map(p => [p.rideId, p.count]));

  return rideRows.map(r => ({
    ...r,
    seatsOccupied: countMap.get(r.id) ?? 0,
    seatsRemaining: r.totalSeats - (countMap.get(r.id) ?? 0),
  }));
}

export async function getRideById(rideId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      id: rides.id,
      eventId: rides.eventId,
      driverId: rides.driverId,
      departureLocation: rides.departureLocation,
      departureTime: rides.departureTime,
      totalSeats: rides.totalSeats,
      notes: rides.notes,
      departureLat: rides.departureLat,
      departureLng: rides.departureLng,
      isVerifiedAttendee: rides.isVerifiedAttendee,
      status: rides.status,
      createdAt: rides.createdAt,
      driverName: users.name,
      driverEmail: users.email,
      eventTitle: events.title,
      eventLumaUrl: events.lumaEventUrl,
    })
    .from(rides)
    .innerJoin(users, eq(rides.driverId, users.id))
    .leftJoin(events, eq(rides.eventId, events.id))
    .where(eq(rides.id, rideId))
    .limit(1);

  if (rows.length === 0) return null;

  const passengerCount = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rideRequests)
    .where(and(eq(rideRequests.rideId, rideId), eq(rideRequests.status, "confirmed")));

  const count = passengerCount[0]?.count ?? 0;

  return {
    ...rows[0],
    seatsOccupied: count,
    seatsRemaining: rows[0].totalSeats - count,
  };
}

export async function joinRide(rideId: number, passengerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(rideRequests)
    .where(and(
      eq(rideRequests.rideId, rideId),
      eq(rideRequests.passengerId, passengerId),
      eq(rideRequests.status, "confirmed")
    ))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("You have already joined this ride");
  }

  const ride = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (ride.length === 0) throw new Error("Ride not found");
  if (ride[0].status !== "active") throw new Error("This ride is no longer active");

  const passengerCount = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rideRequests)
    .where(and(eq(rideRequests.rideId, rideId), eq(rideRequests.status, "confirmed")));

  const currentCount = passengerCount[0]?.count ?? 0;
  if (currentCount >= ride[0].totalSeats) {
    throw new Error("No seats available on this ride");
  }

  if (ride[0].driverId === passengerId) {
    throw new Error("You cannot join your own ride");
  }

  await db.insert(rideRequests).values({
    rideId,
    passengerId,
    status: "confirmed",
  });

  return { success: true };
}

export async function leaveRide(rideId: number, passengerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(rideRequests)
    .set({ status: "cancelled" })
    .where(and(
      eq(rideRequests.rideId, rideId),
      eq(rideRequests.passengerId, passengerId),
      eq(rideRequests.status, "confirmed")
    ));

  return { success: true };
}

export async function cancelRide(rideId: number, driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ride = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (ride.length === 0) throw new Error("Ride not found");
  if (ride[0].driverId !== driverId) throw new Error("Only the driver can cancel this ride");

  await db.update(rides).set({ status: "cancelled" }).where(eq(rides.id, rideId));
  return { success: true };
}

export async function getUserRides(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const driverRides = await db
    .select({
      id: rides.id,
      eventId: rides.eventId,
      driverId: rides.driverId,
      departureLocation: rides.departureLocation,
      departureTime: rides.departureTime,
      totalSeats: rides.totalSeats,
      notes: rides.notes,
      status: rides.status,
      createdAt: rides.createdAt,
      updatedAt: rides.updatedAt,
    })
    .from(rides)
    .where(eq(rides.driverId, userId))
    .orderBy(rides.departureTime);

  const driverRideIds = driverRides.map(r => r.id);
  let driverCountMap = new Map<number, number>();
  if (driverRideIds.length > 0) {
    const counts = await db
      .select({
        rideId: rideRequests.rideId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(rideRequests)
      .where(and(
        eq(rideRequests.status, "confirmed"),
        sql`${rideRequests.rideId} IN (${sql.join(driverRideIds.map(id => sql`${id}`), sql`, `)})`
      ))
      .groupBy(rideRequests.rideId);
    driverCountMap = new Map(counts.map(c => [c.rideId, c.count]));
  }

  const passengerRequests = await db
    .select({
      requestId: rideRequests.id,
      requestStatus: rideRequests.status,
      rideId: rides.id,
      driverId: rides.driverId,
      departureLocation: rides.departureLocation,
      departureTime: rides.departureTime,
      totalSeats: rides.totalSeats,
      notes: rides.notes,
      rideStatus: rides.status,
      driverName: users.name,
    })
    .from(rideRequests)
    .innerJoin(rides, eq(rideRequests.rideId, rides.id))
    .innerJoin(users, eq(rides.driverId, users.id))
    .where(and(
      eq(rideRequests.passengerId, userId),
      eq(rideRequests.status, "confirmed")
    ))
    .orderBy(rides.departureTime);

  const joinedRideIds = passengerRequests.map(r => r.rideId);
  let joinedCountMap = new Map<number, number>();
  if (joinedRideIds.length > 0) {
    const counts = await db
      .select({
        rideId: rideRequests.rideId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(rideRequests)
      .where(and(
        eq(rideRequests.status, "confirmed"),
        sql`${rideRequests.rideId} IN (${sql.join(joinedRideIds.map(id => sql`${id}`), sql`, `)})`
      ))
      .groupBy(rideRequests.rideId);
    joinedCountMap = new Map(counts.map(c => [c.rideId, c.count]));
  }

  return {
    driverRides: driverRides.map(r => ({
      ...r,
      seatsOccupied: driverCountMap.get(r.id) ?? 0,
      seatsRemaining: r.totalSeats - (driverCountMap.get(r.id) ?? 0),
    })),
    passengerRides: passengerRequests.map(r => ({
      ...r,
      seatsOccupied: joinedCountMap.get(r.rideId) ?? 0,
      seatsRemaining: r.totalSeats - (joinedCountMap.get(r.rideId) ?? 0),
    })),
  };
}

export async function getRidePassengers(rideId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      requestId: rideRequests.id,
      passengerId: rideRequests.passengerId,
      passengerName: users.name,
      passengerEmail: users.email,
      joinedAt: rideRequests.createdAt,
    })
    .from(rideRequests)
    .innerJoin(users, eq(rideRequests.passengerId, users.id))
    .where(and(
      eq(rideRequests.rideId, rideId),
      eq(rideRequests.status, "confirmed")
    ));
}

/** Get driver info for a ride (for notifications) */
export async function getRideDriverInfo(rideId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      driverId: rides.driverId,
      driverName: users.name,
      driverEmail: users.email,
      departureLocation: rides.departureLocation,
      departureTime: rides.departureTime,
    })
    .from(rides)
    .innerJoin(users, eq(rides.driverId, users.id))
    .where(eq(rides.id, rideId))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/** Get user info by id (for notifications) */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

// ─── Chat helpers ──────────────────────────────────────────────

export async function sendChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(data);
  const insertId = result[0].insertId;
  const rows = await db
    .select({
      id: chatMessages.id,
      rideId: chatMessages.rideId,
      userId: chatMessages.userId,
      message: chatMessages.message,
      createdAt: chatMessages.createdAt,
      userName: users.name,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.id, insertId))
    .limit(1);
  return rows[0] ?? { id: insertId, rideId: data.rideId, userId: data.userId, message: data.message, createdAt: new Date(), userName: null };
}

export async function getChatMessages(rideId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      id: chatMessages.id,
      rideId: chatMessages.rideId,
      userId: chatMessages.userId,
      message: chatMessages.message,
      createdAt: chatMessages.createdAt,
      userName: users.name,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.rideId, rideId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

/** Check if a user is part of a ride (driver or confirmed passenger) */
export async function isUserInRide(rideId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if driver
  const rideRow = await db.select({ driverId: rides.driverId }).from(rides).where(eq(rides.id, rideId)).limit(1);
  if (rideRow.length > 0 && rideRow[0].driverId === userId) return true;

  // Check if confirmed passenger
  const req = await db
    .select({ id: rideRequests.id })
    .from(rideRequests)
    .where(and(
      eq(rideRequests.rideId, rideId),
      eq(rideRequests.passengerId, userId),
      eq(rideRequests.status, "confirmed")
    ))
    .limit(1);

  return req.length > 0;
}

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, double } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Events table — beach cleanup events that rides are grouped under.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  /** Event title, e.g. "March Beach Cleanup at Malibu" */
  title: varchar("title", { length: 500 }).notNull(),
  /** Event description */
  description: text("description"),
  /** Beach / event location */
  location: varchar("location", { length: 500 }).notNull(),
  /** Event date stored as UTC ms timestamp */
  eventDate: bigint("eventDate", { mode: "number" }).notNull(),
  /** Event status */
  /** Cover image URL (stored in S3) */
  coverImage: text("coverImage"),
  /** Luma event URL for attendee verification */
  lumaEventUrl: text("lumaEventUrl"),
  status: mysqlEnum("eventStatus", ["upcoming", "active", "completed", "cancelled"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Rides table — drivers offer rides to beach cleanup events.
 */
export const rides = mysqlTable("rides", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to events.id — the event this ride is for (nullable for legacy rides) */
  eventId: int("eventId"),
  /** FK to users.id — the driver offering the ride */
  driverId: int("driverId").notNull(),
  /** Departure location (free text, e.g. "Downtown Library Parking Lot") */
  departureLocation: text("departureLocation").notNull(),
  /** Departure time stored as UTC ms timestamp */
  departureTime: bigint("departureTime", { mode: "number" }).notNull(),
  /** Total seats the driver is offering */
  totalSeats: int("totalSeats").notNull(),
  /** Optional notes from the driver */
  notes: text("notes"),
  /** Departure latitude for map pin */
  departureLat: double("departureLat"),
  /** Departure longitude for map pin */
  departureLng: double("departureLng"),
  /** Whether the driver is a verified Luma attendee */
  isVerifiedAttendee: int("isVerifiedAttendee").default(0).notNull(),
  /** Ride status */
  status: mysqlEnum("rideStatus", ["active", "cancelled", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

/**
 * Ride requests — passengers joining a ride.
 */
export const rideRequests = mysqlTable("ride_requests", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to rides.id */
  rideId: int("rideId").notNull(),
  /** FK to users.id — the passenger */
  passengerId: int("passengerId").notNull(),
  /** Request status */
  status: mysqlEnum("requestStatus", ["confirmed", "cancelled"]).default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RideRequest = typeof rideRequests.$inferSelect;
export type InsertRideRequest = typeof rideRequests.$inferInsert;

/**
 * Chat messages — per-ride chat for driver + passengers to coordinate.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to rides.id */
  rideId: int("rideId").notNull(),
  /** FK to users.id — the sender */
  userId: int("userId").notNull(),
  /** Message content */
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

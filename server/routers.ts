import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
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
  getUserById,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  listEvents,
  listUpcomingEvents,
  getEventById,
  sendChatMessage,
  getChatMessages,
  isUserInRide,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { verifyDriverAttendance } from "./luma";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Events ────────────────────────────────────────────────────
  events: router({
    /** List all events (public) */
    list: publicProcedure.query(async () => {
      return listEvents();
    }),

    /** List upcoming/active events (public) */
    upcoming: publicProcedure.query(async () => {
      return listUpcomingEvents();
    }),

    /** Get single event by ID (public) */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getEventById(input.id);
      }),

    /** Create a new event (admin only) */
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1, "Title is required").max(500),
        description: z.string().max(5000).optional(),
        location: z.string().min(1, "Location is required").max(500),
        eventDate: z.number(),
        coverImage: z.string().optional(),
        lumaEventUrl: z.string().max(500).optional(),
        status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return createEvent({
          title: input.title,
          description: input.description ?? null,
          location: input.location,
          eventDate: input.eventDate,
          coverImage: input.coverImage ?? null,
          lumaEventUrl: input.lumaEventUrl ?? null,
          status: input.status ?? "upcoming",
        });
      }),

    /** Upload a cover image for an event (admin only) */
    uploadCover: adminProcedure
      .input(z.object({
        eventId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const key = `event-covers/${input.eventId}-${nanoid(8)}.${ext}`;
        const buffer = Buffer.from(input.imageBase64, "base64");
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateEvent(input.eventId, { coverImage: url });
        return { url };
      }),

    /** Update an event (admin only) */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        location: z.string().min(1).max(500).optional(),
        eventDate: z.number().optional(),
        coverImage: z.string().nullable().optional(),
        lumaEventUrl: z.string().max(500).nullable().optional(),
        status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
        if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
        if (data.lumaEventUrl !== undefined) updateData.lumaEventUrl = data.lumaEventUrl;
        if (data.status !== undefined) updateData.status = data.status;
        return updateEvent(id, updateData as any);
      }),

    /** Cancel an event and all its active rides (admin only) */
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return cancelEvent(input.id);
      }),

    /** Delete an event (admin only) */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteEvent(input.id);
      }),
  }),

  // ─── Rides ─────────────────────────────────────────────────────
  rides: router({
    /** List all active rides, optionally filtered by eventId */
    list: publicProcedure
      .input(z.object({ eventId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return listActiveRides(input?.eventId);
      }),

    /** Get a single ride by ID */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getRideById(input.id);
      }),

    /** Create a new ride offer (driver) */
    create: protectedProcedure
      .input(z.object({
        eventId: z.number({ message: "Please select a cleanup event" }),
        departureLocation: z.string().min(1, "Departure location is required").max(500),
        departureTime: z.number().min(Date.now() - 60000, "Departure time must be in the future"),
        totalSeats: z.number().int().min(1, "At least 1 seat required").max(20, "Maximum 20 seats"),
        notes: z.string().max(1000).optional(),
        departureLat: z.number().optional(),
        departureLng: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate departure time is before event start time
        const event = await getEventById(input.eventId);
        if (!event) {
          throw new Error("Selected event not found");
        }
        if (input.departureTime >= event.eventDate) {
          throw new Error("Departure time must be before the event starts");
        }

        // Verify driver against Luma attendee list if event has a Luma URL.
        // Skip for admins and when LUMA_API_KEY is not configured.
        let isVerified = 0;
        const isAdmin = ctx.user.role === "admin";
        if (event.lumaEventUrl && !isAdmin && process.env.LUMA_API_KEY) {
          if (!ctx.user.email) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `You must have an email address associated with your account to create a ride for this event. Please register on Luma first: ${event.lumaEventUrl}`,
            });
          }
          const verified = await verifyDriverAttendance(event.lumaEventUrl, ctx.user.email);
          if (!verified) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `LUMA_NOT_REGISTERED:${event.lumaEventUrl}`,
            });
          }
          isVerified = 1;
        } else if (isAdmin) {
          isVerified = 1;
        }

        const ride = await createRide({
          eventId: input.eventId,
          driverId: ctx.user.id,
          departureLocation: input.departureLocation,
          departureTime: input.departureTime,
          totalSeats: input.totalSeats,
          notes: input.notes ?? null,
          departureLat: input.departureLat ?? null,
          departureLng: input.departureLng ?? null,
          isVerifiedAttendee: isVerified,
          status: "active",
        });

        // Notify owner about new ride
        notifyOwner({
          title: "New Ride Offered",
          content: `${ctx.user.name || "A user"} offered a ride from ${input.departureLocation} with ${input.totalSeats} seats.`,
        }).catch(() => {});

        return ride;
      }),

    /** Cancel a ride (driver only) */
    cancel: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return cancelRide(input.rideId, ctx.user.id);
      }),

    /** Join a ride as a passenger */
    join: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify passenger against Luma attendee list if the event has a Luma URL.
        // Skip for admins and when LUMA_API_KEY is not configured.
        const rideInfo = await getRideById(input.rideId);
        const isAdminPassenger = ctx.user.role === "admin";
        if (rideInfo?.eventLumaUrl && !isAdminPassenger && process.env.LUMA_API_KEY) {
          if (!ctx.user.email) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `You must have an email address associated with your account to join this ride. Please register on Luma first: ${rideInfo.eventLumaUrl}`,
            });
          }
          const verified = await verifyDriverAttendance(rideInfo.eventLumaUrl, ctx.user.email);
          if (!verified) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `LUMA_NOT_REGISTERED:${rideInfo.eventLumaUrl}`,
            });
          }
        }

        const result = await joinRide(input.rideId, ctx.user.id);

        // Get driver info for notification
        const driverInfo = await getRideDriverInfo(input.rideId);
        if (driverInfo) {
          notifyOwner({
            title: "Passenger Joined Ride",
            content: `${ctx.user.name || "A passenger"} joined the ride from ${driverInfo.departureLocation} driven by ${driverInfo.driverName || "a driver"}.`,
          }).catch(() => {});
        }

        return result;
      }),

    /** Leave a ride as a passenger */
    leave: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return leaveRide(input.rideId, ctx.user.id);
      }),

    /** Get current user's rides (as driver and passenger) */
    myRides: protectedProcedure.query(async ({ ctx }) => {
      return getUserRides(ctx.user.id);
    }),

    /** Get passengers for a ride */
    passengers: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ input }) => {
        return getRidePassengers(input.rideId);
      }),
  }),

  // ─── Chat ──────────────────────────────────────────────────────
  chat: router({
    /** Get messages for a ride (must be driver or passenger) */
    messages: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const inRide = await isUserInRide(input.rideId, ctx.user.id);
        if (!inRide) {
          throw new Error("You must be part of this ride to view messages");
        }
        return getChatMessages(input.rideId);
      }),

    /** Send a message in a ride chat (must be driver or passenger) */
    send: protectedProcedure
      .input(z.object({
        rideId: z.number(),
        message: z.string().min(1, "Message cannot be empty").max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const inRide = await isUserInRide(input.rideId, ctx.user.id);
        if (!inRide) {
          throw new Error("You must be part of this ride to send messages");
        }
        return sendChatMessage({
          rideId: input.rideId,
          userId: ctx.user.id,
          message: input.message,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;

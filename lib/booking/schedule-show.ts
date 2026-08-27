import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import {
  Cinema,
  City,
  Event,
  Movie,
  Screen,
  SeatLayout,
  Show,
  Venue,
} from "@/models";
import type { ManagementUser } from "@/lib/auth/require-management-user";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "A valid record ID is required.");
const seatCategory = z.enum(["REGULAR", "PREMIUM", "RECLINER", "VIP"]);

export const createShowSchema = z
  .object({
    contentType: z.enum(["MOVIE", "EVENT"]),
    movie: objectId.optional(),
    event: objectId.optional(),
    cinema: objectId.optional(),
    venue: objectId.optional(),
    screen: objectId,
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    bookingOpensAt: z.coerce.date().optional(),
    bookingClosesAt: z.coerce.date().optional(),
    pricing: z
      .array(
        z.object({
          category: seatCategory,
          price: z.coerce.number().min(0),
          currency: z.literal("INR").default("INR"),
        }),
      )
      .min(1)
      .max(4),
    bookingLimits: z.object({
      maxSeatsPerBooking: z.coerce.number().int().min(1).max(20).default(10),
      maxBookings: z.coerce.number().int().min(1).optional(),
    }),
  })
  .superRefine((value, context) => {
    if (value.endTime <= value.startTime)
      context.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["endTime"],
      });
    if (
      value.bookingOpensAt &&
      value.bookingClosesAt &&
      value.bookingClosesAt <= value.bookingOpensAt
    )
      context.addIssue({
        code: "custom",
        message: "Booking closing time must be after opening time.",
        path: ["bookingClosesAt"],
      });
    if (value.contentType === "MOVIE" && (!value.movie || value.event))
      context.addIssue({
        code: "custom",
        message: "Select one movie for a movie show.",
        path: ["movie"],
      });
    if (value.contentType === "EVENT" && (!value.event || value.movie))
      context.addIssue({
        code: "custom",
        message: "Select one event for an event show.",
        path: ["event"],
      });
    if (value.contentType === "MOVIE" && (!value.cinema || value.venue))
      context.addIssue({
        code: "custom",
        message: "Movie shows must use a cinema.",
        path: ["cinema"],
      });
    if (value.contentType === "EVENT" && (!value.venue || value.cinema))
      context.addIssue({
        code: "custom",
        message: "Event shows must use a venue.",
        path: ["venue"],
      });
    const duplicateCategory = new Set<string>();
    value.pricing.forEach((price) => {
      if (duplicateCategory.has(price.category))
        context.addIssue({
          code: "custom",
          message: "Each ticket category can have one price.",
          path: ["pricing"],
        });
      duplicateCategory.add(price.category);
    });
  });

export type CreateShowInput = z.infer<typeof createShowSchema>;

export class ShowScheduleConflictError extends Error {
  constructor(message = "This screen already has an overlapping show.") {
    super(message);
  }
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function createScheduledShow(
  actor: ManagementUser,
  rawInput: unknown,
) {
  const input = createShowSchema.parse(rawInput);
  await connectToDatabase();
  const session = await mongoose.startSession();
  let createdShowId = "";
  let eventCategory: string | undefined;
  let eventOrganizer: string | undefined;

  try {
    await session.withTransaction(async () => {
      const screen = await Screen.findOne({
        _id: input.screen,
        active: true,
      }).session(session);
      if (!screen) throw new Error("Screen not found or inactive.");

      const seatLayout = await SeatLayout.findOne({
        _id: screen.seatLayout,
        active: true,
      })
        .session(session)
        .lean();
      if (!seatLayout)
        throw new Error(
          "The selected screen does not have an active seat layout.",
        );

      if (input.contentType === "MOVIE") {
        if (screen.cinema?.toString() !== input.cinema)
          throw new Error(
            "Choose a screen that belongs to the selected cinema.",
          );
        const [movie, cinema] = await Promise.all([
          Movie.exists({ _id: input.movie, active: true }).session(session),
          Cinema.findOne({ _id: input.cinema, active: true })
            .session(session)
            .lean(),
        ]);
        if (!movie || !cinema) throw new Error("Movie or cinema not found.");
      } else {
        if (screen.venue?.toString() !== input.venue)
          throw new Error(
            "Choose a screen that belongs to the selected venue.",
          );
        const [event, venue] = await Promise.all([
          Event.findOne({ _id: input.event, active: true, status: "PUBLISHED" })
            .session(session)
            .lean(),
          Venue.findOne({
            _id: input.venue,
            active: true,
            operationalStatus: "ACTIVE",
            approvalStatus: "APPROVED",
          })
            .session(session)
            .lean(),
        ]);
        if (!event || !venue)
          throw new Error("Event or approved venue not found.");
        if (event.venue.toString() !== input.venue)
          throw new Error("The selected venue does not match this event.");
        if (
          actor.role === "ORGANIZER" &&
          event.organizer.toString() !== actor.organizerId
        )
          throw new Error("You can only schedule your own events.");
        eventCategory = event.category.toString();
        eventOrganizer = event.organizer.toString();
      }

      if (actor.role === "ORGANIZER" && input.contentType === "MOVIE")
        throw new Error("Only admins can schedule movie shows.");

      const layoutCategories = new Set(seatLayout.categories);
      if (input.pricing.some((price) => !layoutCategories.has(price.category)))
        throw new Error(
          "Pricing includes a category that is not present in the screen layout.",
        );
      if (
        seatLayout.categories.some(
          (category) =>
            !input.pricing.some((price) => price.category === category),
        )
      )
        throw new Error("Set a price for every category in the screen layout.");

      const conflictingShow = await Show.exists({
        screen: screen._id,
        active: true,
        bookingStatus: { $in: ["SCHEDULED", "SOLD_OUT"] },
        startTime: { $lt: input.endTime },
        endTime: { $gt: input.startTime },
      }).session(session);
      if (conflictingShow) throw new ShowScheduleConflictError();

      // Every scheduling transaction writes this document. Concurrent schedulers then retry and see the winner's show.
      const screenLock = await Screen.updateOne(
        { _id: screen._id, active: true },
        { $inc: { scheduleVersion: 1 } },
        { session },
      );
      if (screenLock.modifiedCount !== 1)
        throw new Error("Unable to reserve the screen schedule.");

      const city =
        input.contentType === "MOVIE"
          ? (
              await Cinema.findById(input.cinema)
                .session(session)
                .select("city")
                .lean()
            )?.city
          : (
              await Venue.findById(input.venue)
                .session(session)
                .select("city")
                .lean()
            )?.city;
      if (!city) throw new Error("The selected location does not have a city.");
      const activeCity = await City.exists({ _id: city, active: true }).session(
        session,
      );
      if (!activeCity)
        throw new Error("The selected city is inactive for customer bookings.");

      const seatAvailability = seatLayout.rows.flatMap((row) =>
        row.seats.map((seat) => ({
          seatId: seat.seatId,
          category: seat.category,
          status: "AVAILABLE" as const,
        })),
      );
      const show = new Show({
        contentType: input.contentType,
        movie: input.movie,
        event: input.event,
        city,
        category: eventCategory,
        organizer: eventOrganizer,
        venue: input.venue,
        cinema: input.cinema,
        screen: screen._id,
        date: startOfDay(input.startTime),
        startTime: input.startTime,
        endTime: input.endTime,
        bookingOpensAt: input.bookingOpensAt,
        bookingClosesAt: input.bookingClosesAt,
        pricing: input.pricing,
        bookingLimits: input.bookingLimits,
        seatAvailability,
        bookingStatus: "SCHEDULED",
        active: true,
      } as never);
      await show.save({ session });
      createdShowId = show._id.toString();
    });
  } finally {
    await session.endSession();
  }

  return Show.findById(createdShowId)
    .populate("movie", "title")
    .populate("event", "title")
    .populate("cinema", "name")
    .populate("venue", "name")
    .populate("screen", "name")
    .lean();
}

import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, SeatLock, Show } from "@/models";

const LOCK_DURATION_MS = 5 * 60 * 1000;
const activeBookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "REFUND_PENDING",
] as const;

const createSeatLockSchema = z.object({
  showId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid show ID."),
  seatIds: z
    .array(z.string().trim().min(1).max(24))
    .min(1, "Choose at least one seat.")
    .max(20, "You can lock up to 20 seats at once."),
  idempotencyKey: z.string().trim().min(16).max(128),
});

export type SeatLockInput = z.input<typeof createSeatLockSchema>;
export type SeatLockResult = {
  id: string;
  showId: string;
  seatIds: string[];
  expiresAt: Date;
};

export class SeatUnavailableError extends Error {
  constructor(
    message = "One or more seats are no longer available. Please choose again.",
  ) {
    super(message);
  }
}

export class SeatLockInputError extends Error {}

function toResult(lock: {
  _id: mongoose.Types.ObjectId;
  show: mongoose.Types.ObjectId;
  seatIds: string[];
  expiresAt: Date;
}): SeatLockResult {
  return {
    id: lock._id.toString(),
    showId: lock.show.toString(),
    seatIds: lock.seatIds,
    expiresAt: lock.expiresAt,
  };
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function createSeatLock(
  userId: string,
  rawInput: SeatLockInput,
): Promise<SeatLockResult> {
  const parsed = createSeatLockSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new SeatLockInputError(
      parsed.error.issues[0]?.message ?? "Invalid lock request.",
    );
  }

  const input = {
    ...parsed.data,
    seatIds: [...new Set(parsed.data.seatIds)],
  };
  if (input.seatIds.length !== parsed.data.seatIds.length) {
    throw new SeatLockInputError("A seat can only be selected once.");
  }

  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: SeatLockResult | null = null;
    await session.withTransaction(async () => {
      const now = new Date();
      const existing = await SeatLock.findOne({
        idempotencyKey: input.idempotencyKey,
      })
        .session(session)
        .lean();
      if (existing) {
        const isSameRequest =
          existing.user.toString() === userId &&
          existing.show.toString() === input.showId &&
          existing.seatIds.length === input.seatIds.length &&
          existing.seatIds.every((seatId) => input.seatIds.includes(seatId));
        if (!isSameRequest)
          throw new SeatLockInputError(
            "This idempotency key was already used for another lock request.",
          );
        if (existing.status === "ACTIVE" && existing.expiresAt > now) {
          result = toResult(existing);
          return;
        }
        throw new SeatUnavailableError(
          "This seat hold has expired. Choose seats again.",
        );
      }

      const show = await Show.findOne({
        _id: input.showId,
        active: true,
        bookingStatus: "SCHEDULED",
      })
        .select("seatAvailability bookingLimits.maxSeatsPerBooking")
        .session(session)
        .lean();
      if (!show)
        throw new SeatUnavailableError("This show is no longer bookable.");
      const maxSeatsPerBooking = show.bookingLimits?.maxSeatsPerBooking ?? 10;
      if (input.seatIds.length > maxSeatsPerBooking) {
        throw new SeatLockInputError(
          `You can select up to ${maxSeatsPerBooking} seats for this show.`,
        );
      }

      const requestedSeats = new Set(input.seatIds);
      const unavailableSnapshot = show.seatAvailability.some(
        (seat) =>
          requestedSeats.has(seat.seatId) && seat.status !== "AVAILABLE",
      );
      const knownSeats = new Set(
        show.seatAvailability.map((seat) => seat.seatId),
      );
      if (
        unavailableSnapshot ||
        input.seatIds.some((seatId) => !knownSeats.has(seatId))
      ) {
        throw new SeatUnavailableError();
      }

      // TTL deletion is asynchronous. Clearing expired active locks here lets a
      // newly available seat be claimed immediately after its issued expiry.
      await SeatLock.updateMany(
        { show: show._id, status: "ACTIVE", expiresAt: { $lte: now } },
        { $set: { status: "CANCELLED" } },
        { session },
      );
      await Booking.updateMany(
        { show: show._id, status: "PENDING", expiresAt: { $lte: now } },
        { $set: { status: "EXPIRED" } },
        { session },
      );
      const [booked, locked] = await Promise.all([
        Booking.exists({
          show: show._id,
          status: { $in: activeBookingStatuses },
          "seats.seatId": { $in: input.seatIds },
        }).session(session),
        SeatLock.exists({
          show: show._id,
          status: "ACTIVE",
          expiresAt: { $gt: now },
          seatIds: { $in: input.seatIds },
        }).session(session),
      ]);
      if (booked || locked) throw new SeatUnavailableError();

      const [lock] = await SeatLock.create(
        [
          {
            show: show._id,
            user: userId,
            seatIds: input.seatIds,
            status: "ACTIVE",
            idempotencyKey: input.idempotencyKey,
            expiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
          },
        ],
        { session },
      );
      result = toResult(lock);
    });
    if (!result) throw new Error("Seat lock was not created.");
    return result;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    // A competing transaction may win after our availability read. The unique
    // multikey index is the final authority and makes the losing response clear.
    const matchingRequest = await SeatLock.findOne({
      idempotencyKey: input.idempotencyKey,
      user: userId,
      show: input.showId,
    }).lean();
    if (
      matchingRequest &&
      matchingRequest.status === "ACTIVE" &&
      matchingRequest.expiresAt > new Date()
    ) {
      return toResult(matchingRequest);
    }
    throw new SeatUnavailableError();
  } finally {
    await session.endSession();
  }
}

export async function releaseSeatLock(
  userId: string,
  showId: string,
  lockId: string,
) {
  if (!/^[a-f\d]{24}$/i.test(lockId))
    throw new SeatLockInputError("Invalid lock ID.");
  const lock = await SeatLock.findOneAndUpdate(
    { _id: lockId, user: userId, show: showId, status: "ACTIVE" },
    { $set: { status: "CANCELLED" } },
    { returnDocument: "after" },
  ).lean();
  if (!lock)
    throw new SeatUnavailableError("This seat hold is no longer active.");
  return toResult(lock);
}

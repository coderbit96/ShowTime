import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, GroupBooking, SeatLock, Show, User } from "@/models";
import {
  validateCouponForBooking,
  type AppliedCoupon,
} from "@/lib/booking/coupon-engine";
import {
  calculateBookingPricing,
  type PricedSeat,
  type PricingBreakdown,
} from "@/lib/booking/pricing";
import { applyDynamicPricing } from "@/lib/booking/dynamic-pricing";
import { getActiveMembership } from "@/lib/memberships/membership-service";

const activeBookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "REFUND_PENDING",
] as const;
const bookingInputSchema = z.object({
  showId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid show ID."),
  lockId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid seat hold ID."),
  idempotencyKey: z.string().trim().min(16).max(128),
  couponCode: z.string().trim().min(1).max(50).optional(),
  groupBookingId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid group booking ID.")
    .optional(),
});

export type PendingBookingInput = z.input<typeof bookingInputSchema>;
export type BookingSummary = {
  showId: string;
  lockId: string;
  seats: PricedSeat[];
  pricing: PricingBreakdown;
  coupon?: AppliedCoupon;
  expiresAt: Date;
};
export type PendingBookingResult = BookingSummary & {
  bookingId: string;
  status: "PENDING";
};

export class PendingBookingError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

function parseInput(rawInput: PendingBookingInput) {
  const parsed = bookingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PendingBookingError(
      parsed.error.issues[0]?.message ?? "Invalid booking request.",
    );
  }
  return parsed.data;
}

function toSummary(
  lock: {
    _id: mongoose.Types.ObjectId;
    show: mongoose.Types.ObjectId;
    seatIds: string[];
    expiresAt: Date;
  },
  show: {
    seatAvailability: Array<{ seatId: string; category: string }>;
    pricing: Array<{ category: string; price: number }>;
  },
): BookingSummary {
  const categoryBySeat = new Map(
    show.seatAvailability.map((seat) => [seat.seatId, seat.category]),
  );
  const priceByCategory = new Map(
    show.pricing.map((price) => [price.category, price.price]),
  );
  const seats = lock.seatIds.map((seatId) => {
    const category = categoryBySeat.get(seatId);
    const price = category ? priceByCategory.get(category) : undefined;
    if (!category || price === undefined)
      throw new PendingBookingError("The seat hold is no longer valid.", 409);
    return { seatId, category, price };
  });
  return {
    showId: lock.show.toString(),
    lockId: lock._id.toString(),
    seats,
    pricing: calculateBookingPricing({ seats }),
    expiresAt: lock.expiresAt,
  };
}

async function applyCommercialAdjustments(
  userId: string,
  summary: BookingSummary,
  show: {
    _id: mongoose.Types.ObjectId;
    city?: mongoose.Types.ObjectId | null;
    category?: mongoose.Types.ObjectId | null;
    event?: mongoose.Types.ObjectId | null;
    movie?: mongoose.Types.ObjectId | null;
  },
) {
  const dynamicallyPricedSeats = await applyDynamicPricing(summary.seats, {
    showId: show._id,
    city: show.city,
    category: show.category,
    event: show.event,
    movie: show.movie,
  });
  const membership = await getActiveMembership(userId);
  const plan = membership?.plan as
    | {
        benefits?: {
          bookingDiscountPercent?: number;
        };
      }
    | undefined;
  const bookingDiscount = plan?.benefits?.bookingDiscountPercent ?? 0;
  const coupon =
    bookingDiscount > 0
      ? {
          code: "MEMBERSHIP",
          discountType: "PERCENTAGE" as const,
          discountValue: bookingDiscount,
        }
      : undefined;
  return {
    ...summary,
    seats: dynamicallyPricedSeats,
    pricing: calculateBookingPricing({
      seats: dynamicallyPricedSeats,
      coupon,
    }),
  };
}

async function findActiveLock(userId: string, showId: string, lockId: string) {
  const lock = await SeatLock.findOne({
    _id: lockId,
    show: showId,
    user: userId,
    status: "ACTIVE",
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!lock)
    throw new PendingBookingError(
      "Your seat hold expired. Return to seat selection and try again.",
      409,
    );
  return lock;
}

export async function getBookingSummary(
  userId: string,
  showId: string,
  lockId: string,
): Promise<BookingSummary> {
  if (!/^[a-f\d]{24}$/i.test(showId) || !/^[a-f\d]{24}$/i.test(lockId))
    throw new PendingBookingError("Invalid checkout request.");
  await connectToDatabase();
  const lock = await findActiveLock(userId, showId, lockId);
  const show = await Show.findOne({
    _id: showId,
    active: true,
    bookingStatus: "SCHEDULED",
  })
    .select("seatAvailability pricing event movie city category")
    .lean();
  if (!show)
    throw new PendingBookingError("This show is no longer bookable.", 409);
  return applyCommercialAdjustments(userId, toSummary(lock, show), show);
}

export async function createPendingBooking(
  userId: string,
  rawInput: PendingBookingInput,
): Promise<PendingBookingResult> {
  const input = parseInput(rawInput);
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: PendingBookingResult | null = null;
    await session.withTransaction(async () => {
      const now = new Date();
      await Booking.updateMany(
        { show: input.showId, status: "PENDING", expiresAt: { $lte: now } },
        { $set: { status: "EXPIRED" } },
        { session },
      );

      const existing = await Booking.findOne({
        idempotencyKey: input.idempotencyKey,
      })
        .session(session)
        .lean();
      if (existing) {
        if (
          existing.user.toString() !== userId ||
          existing.show.toString() !== input.showId
        ) {
          throw new PendingBookingError(
            "This idempotency key was already used for another booking.",
          );
        }
        if (
          existing.status !== "PENDING" ||
          !existing.expiresAt ||
          existing.expiresAt <= now
        ) {
          throw new PendingBookingError(
            "This checkout session expired. Return to seat selection and try again.",
            409,
          );
        }
        result = {
          bookingId: existing._id.toString(),
          showId: existing.show.toString(),
          lockId: input.lockId,
          seats: existing.seats.map((seat) => ({
            seatId: seat.seatId,
            category: seat.category,
            price: seat.price,
          })),
          pricing: {
            basePrice: existing.pricing.basePrice,
            convenienceFee: existing.pricing.convenienceFee,
            tax: existing.pricing.tax,
            subtotal: existing.pricing.subtotal ?? existing.pricing.total,
            discount: existing.pricing.discount,
            total: existing.pricing.total,
            organizerShare: existing.pricing.organizerShare ?? 0,
            platformCommission: existing.pricing.platformCommission ?? 0,
            platformRevenue: existing.pricing.platformRevenue ?? 0,
            currency: "INR",
          },
          expiresAt: existing.expiresAt,
          status: "PENDING",
        };
        return;
      }

      const lock = await SeatLock.findOne({
        _id: input.lockId,
        show: input.showId,
        user: userId,
        status: "ACTIVE",
        expiresAt: { $gt: now },
      })
        .session(session)
        .lean();
      if (!lock)
        throw new PendingBookingError(
          "Your seat hold expired. Return to seat selection and try again.",
          409,
        );

      const show = await Show.findOne({
        _id: input.showId,
        active: true,
        bookingStatus: "SCHEDULED",
      })
        .select("seatAvailability pricing event movie city category")
        .session(session)
        .lean();
      if (!show)
        throw new PendingBookingError("This show is no longer bookable.", 409);
      const user = input.groupBookingId
        ? await User.findById(userId).session(session).select("email").lean()
        : null;
      const memberEmail = user?.email?.trim().toLowerCase();
      const groupBooking = input.groupBookingId
        ? await GroupBooking.findOne({
            _id: input.groupBookingId,
            status: { $nin: ["PAID", "CANCELLED", "EXPIRED"] },
            $and: [
              { $or: [{ show: { $exists: false } }, { show: show._id }] },
              {
                $or: [
                  { creator: userId },
                  { "members.user": userId },
                  ...(memberEmail ? [{ "members.email": memberEmail }] : []),
                ],
              },
            ],
          })
            .session(session)
            .lean()
        : null;
      if (input.groupBookingId && !groupBooking)
        throw new PendingBookingError(
          "This group booking is not available for checkout.",
          403,
        );

      const baseSummary = await applyCommercialAdjustments(
        userId,
        toSummary(lock, show),
        show,
      );
      const couponResult = input.couponCode
        ? await validateCouponForBooking({
            code: input.couponCode,
            userId,
            eventId: show.event?.toString(),
            categoryId: show.category?.toString(),
            seats: baseSummary.seats,
          })
        : null;
      const summary: BookingSummary = couponResult
        ? {
            ...baseSummary,
            coupon: couponResult.coupon,
            pricing: couponResult.pricing,
          }
        : baseSummary;
      const seatIds = summary.seats.map((seat) => seat.seatId);
      const conflictingBooking = await Booking.exists({
        show: show._id,
        status: { $in: activeBookingStatuses },
        "seats.seatId": { $in: seatIds },
      }).session(session);
      if (conflictingBooking)
        throw new PendingBookingError(
          "One or more seats are no longer available. Return to seat selection and try again.",
          409,
        );

      const [booking] = await Booking.create(
        [
          {
            user: userId,
            show: show._id,
            seats: summary.seats,
            pricing: {
              ...summary.pricing,
              ...(summary.coupon ? { coupon: summary.coupon.id } : {}),
            },
            status: "PENDING",
            idempotencyKey: input.idempotencyKey,
            expiresAt: summary.expiresAt,
            ...(groupBooking ? { groupBooking: groupBooking._id } : {}),
          },
        ],
        { session },
      );
      if (groupBooking) {
        const isCreator = groupBooking.creator.toString() === userId;
        await GroupBooking.updateOne(
          {
            _id: groupBooking._id,
            ...(isCreator
              ? {}
              : {
                  $or: [
                    { "members.user": userId },
                    ...(memberEmail ? [{ "members.email": memberEmail }] : []),
                  ],
                }),
          },
          isCreator
            ? {
                $set: {
                  show: show._id,
                  event: show.event,
                  movie: show.movie,
                  lock: lock._id,
                  selectedSeats: seatIds,
                  status: "CHECKOUT_STARTED",
                },
              }
            : {
                $set: {
                  show: show._id,
                  event: show.event,
                  movie: show.movie,
                  lock: lock._id,
                  status: "CHECKOUT_STARTED",
                  "members.$.user": userId,
                  "members.$.booking": booking._id,
                  "members.$.assignedSeats": seatIds,
                  "members.$.status": "JOINED",
                },
                $addToSet: { selectedSeats: { $each: seatIds } },
              },
          { session },
        );
      }
      await SeatLock.updateOne(
        { _id: lock._id, status: "ACTIVE" },
        { $set: { status: "CANCELLED" } },
        { session },
      );
      result = {
        ...summary,
        bookingId: booking._id.toString(),
        status: "PENDING",
      };
    });
    if (!result) throw new Error("Pending booking was not created.");
    return result;
  } finally {
    await session.endSession();
  }
}

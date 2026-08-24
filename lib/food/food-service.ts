import mongoose from "mongoose";
import { z } from "zod";
import { Booking, FoodItem, FoodOrder, Show } from "@/models";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { debitWallet } from "@/lib/wallet/wallet-service";
import { getActiveMembership } from "@/lib/memberships/membership-service";

const orderSchema = z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid booking."),
  items: z
    .array(
      z.object({
        itemId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid food item."),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  deliveryMode: z
    .enum(["COUNTER_PICKUP", "SEAT_DELIVERY"])
    .default("COUNTER_PICKUP"),
  idempotencyKey: z.string().trim().min(16).max(128),
});

export class FoodOrderError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function listCinemaFood(cinemaId: string) {
  if (!/^[a-f\d]{24}$/i.test(cinemaId))
    throw new FoodOrderError("Invalid cinema.");
  await connectToDatabase();
  return FoodItem.find({ cinema: cinemaId, available: true })
    .sort({ category: 1, price: 1 })
    .lean();
}

export async function createFoodOrder(userId: string, rawInput: unknown) {
  const parsed = orderSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new FoodOrderError(
      parsed.error.issues[0]?.message ?? "Invalid food order.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const existing = await FoodOrder.findOne({
        idempotencyKey: input.idempotencyKey,
      })
        .session(session)
        .lean();
      if (existing) {
        if (existing.user.toString() !== userId)
          throw new FoodOrderError(
            "This idempotency key belongs to another food order.",
            409,
          );
        result = existing;
        return;
      }
      const booking = await Booking.findOne({
        _id: input.bookingId,
        user: userId,
        status: "CONFIRMED",
      })
        .session(session)
        .lean();
      if (!booking)
        throw new FoodOrderError(
          "Food can only be ordered for confirmed cinema bookings.",
          403,
        );
      const show = await Show.findById(booking.show)
        .session(session)
        .select("cinema contentType")
        .lean();
      if (!show?.cinema || show.contentType !== "MOVIE")
        throw new FoodOrderError(
          "Food ordering is available only inside cinemas.",
          409,
        );
      const itemIds = input.items.map((item) => item.itemId);
      const items = await FoodItem.find({
        _id: { $in: itemIds },
        cinema: show.cinema,
        available: true,
      })
        .session(session)
        .lean();
      if (items.length !== new Set(itemIds).size)
        throw new FoodOrderError(
          "One or more food items are unavailable.",
          409,
        );
      const itemById = new Map(
        items.map((item) => [item._id.toString(), item]),
      );
      const lines = input.items.map((line) => {
        const item = itemById.get(line.itemId);
        if (!item) throw new FoodOrderError("Food item unavailable.", 409);
        return {
          item: item._id,
          name: item.name,
          quantity: line.quantity,
          unitPrice: item.price,
          total: item.price * line.quantity,
        };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
      const membership = await getActiveMembership(userId, session);
      const plan = membership?.plan as
        { benefits?: { foodDiscountPercent?: number } } | undefined;
      const discount = Math.round(
        (subtotal * (plan?.benefits?.foodDiscountPercent ?? 0)) / 100,
      );
      const total = Math.max(0, subtotal - discount);
      const [order] = await FoodOrder.create(
        [
          {
            user: userId,
            booking: booking._id,
            cinema: show.cinema,
            show: booking.show,
            items: lines,
            subtotal,
            discount,
            total,
            status: "CONFIRMED",
            deliveryMode: input.deliveryMode,
            seatNumbers: booking.seats.map((seat) => seat.seatId),
            idempotencyKey: input.idempotencyKey,
          },
        ],
        { session },
      );
      if (total > 0) {
        await debitWallet({
          userId,
          amount: total,
          source: "FOOD",
          foodOrder: order._id,
          idempotencyKey: `food-wallet:${input.idempotencyKey}`,
          session,
          note: "Cinema food order",
        });
      }
      result = order;
    });
    return result;
  } finally {
    await session.endSession();
  }
}

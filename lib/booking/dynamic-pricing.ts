import type { Types } from "mongoose";
import { DynamicPricingRule } from "@/models";
import type { PricedSeat } from "@/lib/booking/pricing";

type DynamicContext = {
  showId?: string | Types.ObjectId;
  city?: string | Types.ObjectId | null;
  category?: string | Types.ObjectId | null;
  event?: string | Types.ObjectId | null;
  movie?: string | Types.ObjectId | null;
  now?: Date;
};

export async function applyDynamicPricing(
  seats: PricedSeat[],
  context: DynamicContext,
) {
  const now = context.now ?? new Date();
  const filter = {
    active: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
    $or: [
      { scope: "GLOBAL" },
      ...(context.city ? [{ scope: "CITY", city: context.city }] : []),
      ...(context.category
        ? [{ scope: "CATEGORY", category: context.category }]
        : []),
      ...(context.event ? [{ scope: "EVENT", event: context.event }] : []),
      ...(context.movie ? [{ scope: "MOVIE", movie: context.movie }] : []),
      ...(context.showId ? [{ scope: "SHOW", show: context.showId }] : []),
    ],
  };
  const rules = await DynamicPricingRule.find(filter as never)
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  if (!rules.length) return seats;
  return seats.map((seat) => {
    const rule = rules.find(
      (candidate) =>
        !candidate.seatCategory || candidate.seatCategory === seat.category,
    );
    if (!rule) return seat;
    const price = Math.max(
      0,
      Math.round(seat.price * rule.multiplier + rule.flatAdjustment),
    );
    return { ...seat, price };
  });
}

import { Coupon, Booking } from "@/models";
import {
  calculateBookingPricing,
  type PricedSeat,
  type PricingBreakdown,
} from "@/lib/booking/pricing";

export type AppliedCoupon = {
  id: string;
  code: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  maximumDiscount?: number;
};

export class CouponValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

export async function validateCouponForBooking({
  code,
  userId,
  eventId,
  categoryId,
  seats,
}: {
  code: string;
  userId: string;
  eventId?: string;
  categoryId?: string;
  seats: PricedSeat[];
}): Promise<{ coupon: AppliedCoupon; pricing: PricingBreakdown }> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new CouponValidationError("Enter a coupon code.");

  const coupon = await Coupon.findOne({ code: normalizedCode }).lean();
  if (!coupon)
    throw new CouponValidationError("Coupon code was not found.", 404);
  if (!coupon.active)
    throw new CouponValidationError("This coupon is inactive.", 400);

  const now = new Date();
  if (coupon.startDate > now)
    throw new CouponValidationError("This coupon is not active yet.", 400);
  if (coupon.expiryDate < now)
    throw new CouponValidationError("This coupon has expired.", 400);

  const preliminaryPricing = calculateBookingPricing({ seats });
  if (preliminaryPricing.subtotal < coupon.minimumCartAmount) {
    throw new CouponValidationError(
      `This coupon requires a cart subtotal of at least INR ${coupon.minimumCartAmount}.`,
      400,
    );
  }

  const applicableEvents = coupon.applicableEvents.map((id) => id.toString());
  const applicableCategories = coupon.applicableCategories.map((id) =>
    id.toString(),
  );
  const restricted =
    applicableEvents.length > 0 || applicableCategories.length > 0;
  const appliesToEvent = Boolean(eventId && applicableEvents.includes(eventId));
  const appliesToCategory = Boolean(
    categoryId && applicableCategories.includes(categoryId),
  );
  if (restricted && !appliesToEvent && !appliesToCategory) {
    throw new CouponValidationError(
      "This coupon is not eligible for the selected show.",
      400,
    );
  }

  const activePendingQuery = {
    status: "PENDING" as const,
    expiresAt: { $gt: now },
    "pricing.coupon": coupon._id,
  };
  const [activePendingCount, userUsageCount] = await Promise.all([
    Booking.countDocuments(activePendingQuery),
    Booking.countDocuments({
      user: userId,
      "pricing.coupon": coupon._id,
      $or: [
        { status: { $in: ["CONFIRMED", "REFUND_PENDING"] } },
        { status: "PENDING", expiresAt: { $gt: now } },
      ],
    }),
  ]);
  if (coupon.usedCount + activePendingCount >= coupon.usageLimit)
    throw new CouponValidationError(
      "This coupon has reached its usage limit.",
      400,
    );
  if (userUsageCount >= coupon.perUserLimit)
    throw new CouponValidationError(
      "You have reached the usage limit for this coupon.",
      400,
    );

  const appliedCoupon: AppliedCoupon = {
    id: coupon._id.toString(),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    ...(typeof coupon.maximumDiscount === "number"
      ? { maximumDiscount: coupon.maximumDiscount }
      : {}),
  };
  return {
    coupon: appliedCoupon,
    pricing: calculateBookingPricing({ seats, coupon: appliedCoupon }),
  };
}

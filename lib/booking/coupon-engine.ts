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
  movieId,
  categoryId,
  organizerId,
  cityId,
  seats,
}: {
  code: string;
  userId: string;
  eventId?: string;
  movieId?: string;
  categoryId?: string;
  organizerId?: string;
  cityId?: string;
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

  const targetMatches = (
    targets: Array<{ toString(): string }> | undefined,
    value: string | undefined,
  ) =>
    !targets?.length ||
    Boolean(value && targets.some((id) => id.toString() === value));
  const hasContentTargets =
    coupon.applicableEvents.length > 0 || coupon.applicableMovies.length > 0;
  const matchesContentTarget =
    !hasContentTargets ||
    Boolean(
      eventId &&
      coupon.applicableEvents.some((id) => id.toString() === eventId),
    ) ||
    Boolean(
      movieId &&
      coupon.applicableMovies.some((id) => id.toString() === movieId),
    );
  if (
    !matchesContentTarget ||
    !targetMatches(coupon.applicableCategories, categoryId) ||
    !targetMatches(coupon.applicableOrganizers, organizerId) ||
    !targetMatches(coupon.applicableCities, cityId)
  ) {
    throw new CouponValidationError(
      "This coupon is not eligible for the selected show.",
      400,
    );
  }

  if (coupon.newUserOnly) {
    const hasPreviousBooking = await Booking.exists({
      user: userId,
      status: { $in: ["CONFIRMED", "REFUND_PENDING", "REFUNDED"] },
    });
    if (hasPreviousBooking)
      throw new CouponValidationError(
        "This coupon is available only for new customers.",
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

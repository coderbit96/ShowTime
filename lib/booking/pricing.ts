export type PricedSeat = {
  seatId: string;
  category: string;
  price: number;
};

export type PricingCoupon = {
  code: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  maximumDiscount?: number;
};

export type PricingRules = {
  convenienceFeePerTicket: number;
  taxRatePercent: number;
  platformCommissionRatePercent: number;
};

export type PricingBreakdown = {
  basePrice: number;
  convenienceFee: number;
  tax: number;
  subtotal: number;
  discount: number;
  total: number;
  organizerShare: number;
  platformCommission: number;
  platformRevenue: number;
  currency: "INR";
};

const defaultPricingRules: PricingRules = {
  convenienceFeePerTicket: 20,
  taxRatePercent: 18,
  platformCommissionRatePercent: 10,
};

function toWholeRupees(value: number) {
  return Math.round(value);
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon?: PricingCoupon,
) {
  if (!coupon) return 0;
  const uncappedDiscount =
    coupon.discountType === "PERCENTAGE"
      ? toWholeRupees((subtotal * coupon.discountValue) / 100)
      : toWholeRupees(coupon.discountValue);
  const cappedDiscount =
    coupon.discountType === "PERCENTAGE" && coupon.maximumDiscount !== undefined
      ? Math.min(uncappedDiscount, coupon.maximumDiscount)
      : uncappedDiscount;
  return Math.max(0, Math.min(subtotal, cappedDiscount));
}

export function calculateBookingPricing({
  seats,
  coupon,
  rules = defaultPricingRules,
}: {
  seats: PricedSeat[];
  coupon?: PricingCoupon;
  rules?: Partial<PricingRules>;
}): PricingBreakdown {
  if (!seats.length) throw new Error("At least one ticket is required.");
  const appliedRules = { ...defaultPricingRules, ...rules };
  const basePrice = toWholeRupees(
    seats.reduce((sum, seat) => sum + seat.price, 0),
  );
  const convenienceFee = toWholeRupees(
    seats.length * appliedRules.convenienceFeePerTicket,
  );
  const tax = toWholeRupees(
    (convenienceFee * appliedRules.taxRatePercent) / 100,
  );
  const subtotal = basePrice + convenienceFee + tax;
  const discount = calculateCouponDiscount(subtotal, coupon);
  const total = subtotal - discount;

  // Coupon value is applied to ticket revenue first so the organizer payout and
  // platform commission always reconcile to the exact customer total.
  const discountedTicketRevenue = Math.max(0, basePrice - discount);
  const platformCommission = toWholeRupees(
    (discountedTicketRevenue * appliedRules.platformCommissionRatePercent) /
      100,
  );
  const organizerShare = discountedTicketRevenue - platformCommission;
  const platformRevenue = total - organizerShare;

  return {
    basePrice,
    convenienceFee,
    tax,
    subtotal,
    discount,
    total,
    organizerShare,
    platformCommission,
    platformRevenue,
    currency: "INR",
  };
}

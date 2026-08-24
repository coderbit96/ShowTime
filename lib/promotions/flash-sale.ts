import { connectToDatabase } from "@/lib/mongodb/connect";
import { Coupon } from "@/models";

export type FlashSale = {
  id: string;
  code: string;
  label: string;
  headline: string;
  discountText: string;
  endsAt: string;
  serverNow: string;
};

function discountText(coupon: {
  discountType: string;
  discountValue: number;
  maximumDiscount?: number | null;
}) {
  if (coupon.discountType === "PERCENTAGE") {
    return `${coupon.discountValue}% OFF${
      coupon.maximumDiscount ? ` up to INR ${coupon.maximumDiscount}` : ""
    }`;
  }
  return `INR ${coupon.discountValue} OFF`;
}

export async function getActiveFlashSale(): Promise<FlashSale | null> {
  try {
    await connectToDatabase();
    const now = new Date();
    const coupon = await Coupon.findOne({
      active: true,
      flashSaleActive: true,
      startDate: { $lte: now },
      expiryDate: { $gt: now },
      $or: [
        { flashSaleEndsAt: { $exists: false } },
        { flashSaleEndsAt: null },
        { flashSaleEndsAt: { $gt: now } },
      ],
    })
      .sort({ flashSaleEndsAt: 1, expiryDate: 1 })
      .lean();
    if (!coupon) return null;
    const endsAt =
      coupon.flashSaleEndsAt && coupon.flashSaleEndsAt < coupon.expiryDate
        ? coupon.flashSaleEndsAt
        : coupon.expiryDate;
    return {
      id: coupon._id.toString(),
      code: coupon.code,
      label: coupon.flashSaleLabel ?? "FLASH SALE",
      headline:
        coupon.flashSaleHeadline ??
        `${discountText(coupon)} on selected experiences`,
      discountText: discountText(coupon),
      endsAt: endsAt.toISOString(),
      serverNow: now.toISOString(),
    };
  } catch {
    return null;
  }
}

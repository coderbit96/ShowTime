import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Coupon } from "@/models";

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .transform((value) => value.toUpperCase()),
  discountType: z.enum(["FIXED", "PERCENTAGE"]),
  discountValue: z.number().min(0),
  minimumCartAmount: z.number().min(0).default(0),
  maximumDiscount: z.number().min(0).optional(),
  startDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  usageLimit: z.number().int().min(1),
  perUserLimit: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
  flashSaleActive: z.boolean().default(false),
  flashSaleLabel: z.string().trim().max(40).optional(),
  flashSaleHeadline: z.string().trim().max(140).optional(),
  flashSaleEndsAt: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const coupons = await Coupon.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ coupons });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = couponSchema.parse(await request.json());
    if (input.expiryDate <= input.startDate)
      return NextResponse.json(
        { error: "Expiry must be after the start date." },
        { status: 400 },
      );
    if (input.flashSaleEndsAt && input.flashSaleEndsAt > input.expiryDate)
      return NextResponse.json(
        { error: "Flash sale deadline must be before coupon expiry." },
        { status: 400 },
      );
    const coupon = await Coupon.create(input);
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "COUPON_CREATED",
      resourceType: "Coupon",
      resourceId: coupon._id.toString(),
      after: coupon.toObject(),
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

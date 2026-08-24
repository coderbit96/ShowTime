import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { MembershipPlan } from "@/models";

const planSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((value) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    ),
  price: z.number().min(0),
  durationDays: z.number().int().min(1),
  benefits: z
    .object({
      rewardMultiplier: z.number().min(1).default(1),
      bookingDiscountPercent: z.number().min(0).max(100).default(0),
      foodDiscountPercent: z.number().min(0).max(100).default(0),
      freeCancellation: z.boolean().default(false),
      priorityAccess: z.boolean().default(false),
    })
    .default({
      rewardMultiplier: 1,
      bookingDiscountPercent: 0,
      foodDiscountPercent: 0,
      freeCancellation: false,
      priorityAccess: false,
    }),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const plans = await MembershipPlan.find({})
      .sort({ active: -1, price: 1 })
      .lean();
    return NextResponse.json({ plans });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = planSchema.parse(await request.json());
    const plan = await MembershipPlan.create(input);
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "MEMBERSHIP_PLAN_CREATED",
      resourceType: "MembershipPlan",
      resourceId: plan._id.toString(),
      after: plan.toObject(),
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

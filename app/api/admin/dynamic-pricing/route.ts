import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { DynamicPricingRule } from "@/models";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i)
  .optional();
const ruleSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    scope: z.enum(["GLOBAL", "CITY", "CATEGORY", "EVENT", "MOVIE", "SHOW"]),
    city: objectId,
    category: objectId,
    event: objectId,
    movie: objectId,
    show: objectId,
    seatCategory: z.enum(["REGULAR", "PREMIUM", "RECLINER", "VIP"]).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    multiplier: z.number().min(0).default(1),
    flatAdjustment: z.number().default(0),
    priority: z.number().int().default(0),
    active: z.boolean().default(true),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Dynamic pricing end time must be after start time.",
    path: ["endsAt"],
  });

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const rules = await DynamicPricingRule.find({})
      .sort({ active: -1, priority: -1, createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ rules });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = ruleSchema.parse(await request.json());
    const rule = await DynamicPricingRule.create(input);
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "DYNAMIC_PRICING_RULE_CREATED",
      resourceType: "DynamicPricingRule",
      resourceId: rule._id.toString(),
      after: rule.toObject(),
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

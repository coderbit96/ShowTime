import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Coupon } from "@/models";

const updateSchema = z.object({ active: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const before = await Coupon.findById(id).lean();
    if (!before)
      return NextResponse.json(
        { error: "Coupon was not found." },
        { status: 404 },
      );
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: { active: input.active } },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: input.active ? "COUPON_ACTIVATED" : "COUPON_DEACTIVATED",
      resourceType: "Coupon",
      resourceId: id,
      before,
      after: coupon,
    });
    return NextResponse.json({ coupon });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

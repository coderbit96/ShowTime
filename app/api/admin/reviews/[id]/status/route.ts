import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Review } from "@/models";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const { status } = schema.parse(await request.json());
    const before = await Review.findById(id).lean();
    if (!before)
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    const after = await Review.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: `REVIEW_${status}`,
      resourceType: "Review",
      resourceId: id,
      before,
      after,
    });
    return NextResponse.json({ review: after });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

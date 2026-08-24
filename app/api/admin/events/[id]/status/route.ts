import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Event } from "@/models";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "PUBLISH", "CANCEL"]),
});
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const { action } = schema.parse(await request.json());
    const before = await Event.findById(id).lean();
    if (!before)
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    const update =
      action === "APPROVE"
        ? { approvalStatus: "APPROVED" }
        : action === "REJECT"
          ? { approvalStatus: "REJECTED", status: "DRAFT" }
          : action === "PUBLISH"
            ? { approvalStatus: "APPROVED", status: "PUBLISHED" }
            : { status: "CANCELLED", active: false };
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: `EVENT_${action}`,
      resourceType: "Event",
      resourceId: id,
      before,
      after: event,
    });
    return NextResponse.json({ event });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

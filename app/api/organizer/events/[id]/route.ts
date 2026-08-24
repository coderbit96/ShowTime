import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Event } from "@/models";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    const { id } = await params;
    const before = await Event.findOne({
      _id: id,
      organizer: actor.organizerId,
    }).lean();
    if (!before)
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (before.status === "PUBLISHED")
      return NextResponse.json(
        { error: "Published events require admin review before edits." },
        { status: 409 },
      );
    const after = await Event.findByIdAndUpdate(
      id,
      { $set: await request.json() },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ORGANIZER",
      action: "EVENT_UPDATED",
      resourceType: "Event",
      resourceId: id,
      before,
      after,
    });
    return NextResponse.json({ event: after });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

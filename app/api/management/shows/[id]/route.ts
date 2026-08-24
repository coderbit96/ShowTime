import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { Show } from "@/models";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireManagementUser(request);
    const { id } = await context.params;
    const show = await Show.findById(id);
    if (!show) throw new Error("Show not found.");
    if (
      actor.role !== "ADMIN" &&
      show.organizer?.toString() !== actor.organizerId
    )
      throw new Error("You can only cancel your own shows.");
    if (show.bookingStatus === "COMPLETED")
      throw new Error("Completed shows cannot be cancelled.");
    const before = show.toObject();
    show.bookingStatus = "CANCELLED";
    show.active = false;
    await show.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: actor.role,
      action: "SHOW_CANCELLED",
      resourceType: "Show",
      resourceId: id,
      before,
      after: show.toObject(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { updateVenueSchema } from "@/lib/management/schemas";
import { Venue } from "@/models";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

type RouteContext = { params: Promise<{ id: string }> };

async function getEditableVenue(request: NextRequest, context: RouteContext) {
  const actor = await requireManagementUser(request);
  const { id } = await context.params;
  const venue = await Venue.findById(id);
  if (!venue) throw new Error("Venue not found.");
  if (
    actor.role !== "ADMIN" &&
    venue.createdBy?.toString() !== actor.organizerId
  )
    throw new Error("You can only manage venues you created.");
  return { actor, venue };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { actor, venue } = await getEditableVenue(request, context);
    const input = updateVenueSchema.parse(await request.json());
    if (actor.role !== "ADMIN") {
      delete input.approvalStatus;
      delete input.active;
    }
    if (input.coordinates)
      venue.location = { type: "Point", coordinates: input.coordinates };
    Object.assign(venue, input);
    await venue.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: actor.role,
      action: "VENUE_UPDATED",
      resourceType: "Venue",
      resourceId: venue._id.toString(),
      after: venue.toObject(),
    });
    return NextResponse.json({ venue });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { actor, venue } = await getEditableVenue(request, context);
    if (actor.role !== "ADMIN")
      throw new Error("Only an admin can archive a venue.");
    venue.active = false;
    await venue.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "VENUE_ARCHIVED",
      resourceType: "Venue",
      resourceId: venue._id.toString(),
      before: { active: true },
      after: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

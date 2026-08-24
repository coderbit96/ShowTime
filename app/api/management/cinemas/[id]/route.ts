import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { updateCinemaSchema } from "@/lib/management/schemas";
import { Cinema } from "@/models";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await context.params;
    const input = updateCinemaSchema.parse(await request.json());
    const cinema = await Cinema.findById(id);
    if (!cinema) throw new Error("Cinema not found.");
    if (input.coordinates)
      cinema.location = { type: "Point", coordinates: input.coordinates };
    Object.assign(cinema, input);
    await cinema.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CINEMA_UPDATED",
      resourceType: "Cinema",
      resourceId: cinema._id.toString(),
      after: cinema.toObject(),
    });
    return NextResponse.json({ cinema });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await context.params;
    const cinema = await Cinema.findById(id);
    if (!cinema) throw new Error("Cinema not found.");
    cinema.active = false;
    await cinema.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CINEMA_ARCHIVED",
      resourceType: "Cinema",
      resourceId: cinema._id.toString(),
      before: { active: true },
      after: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

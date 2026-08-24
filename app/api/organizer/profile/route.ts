import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { Organizer } from "@/models";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

const profileSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().trim().max(32).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    const organizer = await Organizer.findById(actor.organizerId)
      .populate("user", "name email phone avatar")
      .lean();
    return NextResponse.json({ organizer });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    const input = profileSchema.parse(await request.json());
    const before = await Organizer.findById(actor.organizerId).lean();
    if (!before)
      return NextResponse.json(
        { error: "Organizer profile not found." },
        { status: 404 },
      );
    const after = await Organizer.findByIdAndUpdate(
      actor.organizerId,
      { $set: input },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ORGANIZER",
      action: "ORGANIZER_PROFILE_UPDATED",
      resourceType: "Organizer",
      resourceId: actor.organizerId,
      before,
      after,
    });
    return NextResponse.json({ organizer: after });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

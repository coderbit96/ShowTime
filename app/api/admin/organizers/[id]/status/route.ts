import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { Organizer } from "@/models";

const schema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
  canCreateVenues: z.boolean().optional(),
  payoutEnabled: z.boolean().optional(),
});
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const before = await Organizer.findById(id).lean();
    if (!before)
      return NextResponse.json(
        { error: "Organizer not found." },
        { status: 404 },
      );
    const organizer = await Organizer.findByIdAndUpdate(
      id,
      {
        $set: {
          verificationStatus: input.status,
          ...(input.canCreateVenues === undefined
            ? {}
            : { canCreateVenues: input.canCreateVenues }),
          ...(input.payoutEnabled === undefined
            ? {}
            : { payoutEnabled: input.payoutEnabled }),
        },
      },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: `ORGANIZER_${input.status}`,
      resourceType: "Organizer",
      resourceId: id,
      before,
      after: organizer,
    });
    return NextResponse.json({ organizer });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

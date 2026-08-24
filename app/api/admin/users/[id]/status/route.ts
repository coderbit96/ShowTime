import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { User } from "@/models";

const schema = z.object({ active: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const before = await User.findById(id).lean();
    if (!before)
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    const after = await User.findByIdAndUpdate(
      id,
      { $set: { active: input.active } },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: input.active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      resourceType: "User",
      resourceId: id,
      before,
      after,
    });
    return NextResponse.json({ user: after });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

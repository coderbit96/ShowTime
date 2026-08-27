import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { User } from "@/models";

const schema = z.object({
  active: z.boolean().optional(),
  action: z
    .enum(["ACTIVATE", "DEACTIVATE", "BLOCK", "UNBLOCK", "RESET_ACCESS"])
    .optional(),
  reason: z.string().trim().max(500).optional(),
});

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
    const action =
      input.action ?? (input.active === false ? "DEACTIVATE" : "ACTIVATE");
    if (action === "RESET_ACCESS") {
      await getFirebaseAdminAuth().revokeRefreshTokens(before.firebaseUid);
    }
    const changes =
      action === "BLOCK"
        ? {
            active: false,
            accountStatus: "BLOCKED",
            blockedAt: new Date(),
            blockReason: input.reason ?? "Blocked by an administrator.",
          }
        : action === "DEACTIVATE"
          ? { active: false, accountStatus: "INACTIVE" }
          : action === "ACTIVATE" || action === "UNBLOCK"
            ? {
                active: true,
                accountStatus: "ACTIVE",
                blockedAt: undefined,
                blockReason: undefined,
              }
            : { accessResetAt: new Date() };
    const after = await User.findByIdAndUpdate(
      id,
      {
        $set: changes,
        ...((["ACTIVATE", "UNBLOCK"] as string[]).includes(action)
          ? { $unset: { blockedAt: 1, blockReason: 1 } }
          : {}),
      },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: `USER_${action}`,
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

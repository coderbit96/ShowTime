import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { creditWallet } from "@/lib/wallet/wallet-service";

const creditSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  amount: z.number().min(0).default(0),
  points: z.number().int().min(0).default(0),
  idempotencyKey: z.string().trim().min(16).max(128),
  note: z.string().trim().max(300).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = creditSchema.parse(await request.json());
    const transaction = await creditWallet({
      userId: input.userId,
      amount: input.amount,
      points: input.points,
      source: "ADMIN",
      idempotencyKey: input.idempotencyKey,
      note: input.note,
    });
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "WALLET_CREDIT_CREATED",
      resourceType: "WalletTransaction",
      resourceId: transaction._id.toString(),
      after: {
        userId: input.userId,
        amount: input.amount,
        points: input.points,
      },
    });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

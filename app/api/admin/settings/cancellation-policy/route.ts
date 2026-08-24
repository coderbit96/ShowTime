import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { getCancellationPolicy } from "@/lib/refunds/refund-service";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Setting } from "@/models";

const policySchema = z.object({
  fullRefundHours: z.number().min(0).max(720),
  partialRefundHours: z.number().min(0).max(720),
  partialRefundPercent: z.number().min(0).max(100),
});

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    return NextResponse.json({ policy: await getCancellationPolicy() });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireManagementUser(request, ["ADMIN"]);
    const parsed = policySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid cancellation policy." },
        { status: 400 },
      );
    await connectToDatabase();
    await Setting.updateOne(
      { key: "cancellation_policy" },
      {
        $set: {
          value: parsed.data,
          scope: "BOOKING",
          description: "Customer cancellation and refund policy.",
          updatedBy: admin.id,
        },
      },
      { upsert: true },
    );
    return NextResponse.json({ policy: parsed.data });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

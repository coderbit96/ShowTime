import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Refund } from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    await connectToDatabase();
    const refunds = await Refund.find()
      .populate({ path: "booking", select: "status pricing seats user" })
      .populate({ path: "payment", select: "gatewayPaymentId status" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ refunds });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

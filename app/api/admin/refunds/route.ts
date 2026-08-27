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
      .populate({
        path: "booking",
        select: "status pricing seats user show",
        populate: [
          { path: "user", select: "name email phone" },
          {
            path: "show",
            select: "startTime movie event venue cinema",
            populate: [
              { path: "movie", select: "title" },
              { path: "event", select: "title" },
              { path: "venue", select: "name" },
              { path: "cinema", select: "name" },
            ],
          },
        ],
      })
      .populate({
        path: "payment",
        select:
          "gatewayPaymentId gatewayOrderId paymentMethod status amount currency createdAt paidAt",
      })
      .populate({ path: "adminApprover", select: "name email" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ refunds });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { checkInTicket } from "@/lib/tickets/check-in";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const body = (await request.json()) as {
      qrPayload?: string;
      showId?: string;
    };
    if (!body.qrPayload)
      return NextResponse.json(
        { error: "A QR payload is required." },
        { status: 400 },
      );
    const result = await checkInTicket({
      actor,
      qrPayload: body.qrPayload,
      showId: body.showId,
    });
    return NextResponse.json({
      ...result,
      ...(result.outcome === "ALREADY_USED" && result.checkedInAt
        ? { checkedInAt: result.checkedInAt.toISOString() }
        : {}),
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

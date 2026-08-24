import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { RefundFlowError, requestRefund } from "@/lib/refunds/refund-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      bookingId?: string;
      idempotencyKey?: string;
      manualReview?: boolean;
    };
    const result = await requestRefund(user.id, {
      bookingId: body.bookingId ?? "",
      idempotencyKey: body.idempotencyKey ?? "",
      manualReview: body.manualReview,
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof RefundFlowError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Refund request failed", error);
    return NextResponse.json(
      { error: "Unable to request a refund." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  createRazorpayOrderForBooking,
  PaymentFlowError,
} from "@/lib/payments/payment-service";
import { RazorpayConfigurationError } from "@/lib/payments/razorpay";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      bookingId?: string;
      idempotencyKey?: string;
    };
    const order = await createRazorpayOrderForBooking(user.id, {
      bookingId: body.bookingId ?? "",
      idempotencyKey: body.idempotencyKey ?? "",
    });
    return NextResponse.json({ order });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof PaymentFlowError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof RazorpayConfigurationError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("Razorpay order creation failed", error);
    return NextResponse.json(
      { error: "Unable to create the Razorpay order." },
      { status: 500 },
    );
  }
}

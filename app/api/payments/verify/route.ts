import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  PaymentFlowError,
  recordCheckoutSignature,
} from "@/lib/payments/payment-service";
import {
  RazorpayConfigurationError,
  verifyRazorpayCheckoutSignature,
} from "@/lib/payments/razorpay";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      bookingId?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };
    if (!body.orderId || !body.paymentId || !body.signature)
      return NextResponse.json(
        { error: "Incomplete Razorpay payment response." },
        { status: 400 },
      );
    if (
      !verifyRazorpayCheckoutSignature({
        orderId: body.orderId,
        paymentId: body.paymentId,
        signature: body.signature,
      })
    ) {
      return NextResponse.json(
        { error: "Razorpay payment signature is invalid." },
        { status: 400 },
      );
    }
    const payment = await recordCheckoutSignature({
      userId: user.id,
      bookingId: body.bookingId ?? "",
      orderId: body.orderId,
      paymentId: body.paymentId,
      signature: body.signature,
    });
    return NextResponse.json({ payment, awaitingWebhook: true });
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
    console.error("Razorpay checkout verification failed", error);
    return NextResponse.json(
      { error: "Unable to verify this payment response." },
      { status: 500 },
    );
  }
}

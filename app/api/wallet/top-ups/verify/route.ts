import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { PaymentFlowError } from "@/lib/payments/payment-service";
import {
  RazorpayConfigurationError,
  verifyRazorpayCheckoutSignature,
} from "@/lib/payments/razorpay";
import { recordWalletTopUpSignature } from "@/lib/wallet/wallet-topup-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
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
    )
      return NextResponse.json(
        { error: "Razorpay payment signature is invalid." },
        { status: 400 },
      );
    const topUp = await recordWalletTopUpSignature({
      userId: user.id,
      orderId: body.orderId,
      paymentId: body.paymentId,
      signature: body.signature,
    });
    return NextResponse.json({ topUp, awaitingWebhook: true });
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
    console.error("Wallet recharge verification failed", error);
    return NextResponse.json(
      { error: "Unable to verify the wallet recharge." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { PaymentFlowError } from "@/lib/payments/payment-service";
import { RazorpayConfigurationError } from "@/lib/payments/razorpay";
import { createWalletTopUpOrder } from "@/lib/wallet/wallet-topup-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      amount?: number;
      idempotencyKey?: string;
    };
    const order = await createWalletTopUpOrder(user.id, {
      amount: body.amount,
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
    console.error("Wallet recharge order creation failed", error);
    return NextResponse.json(
      { error: "Unable to create the wallet recharge order." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  PaymentFlowError,
  processRazorpayWebhook,
} from "@/lib/payments/payment-service";
import {
  RazorpayConfigurationError,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";
import { publishPaymentLifecycleNotifications } from "@/lib/notifications/create-notification";

type RazorpayWebhookPayload = {
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
      };
    };
  };
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  try {
    if (
      !verifyRazorpayWebhookSignature(
        rawBody,
        request.headers.get("x-razorpay-signature"),
      )
    )
      return NextResponse.json(
        { error: "Invalid Razorpay webhook signature." },
        { status: 400 },
      );
    const event = request.headers.get("x-razorpay-event") as
      "payment.captured" | "payment.failed" | null;
    if (event !== "payment.captured" && event !== "payment.failed")
      return NextResponse.json({ received: true, ignored: true });
    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const payment = payload.payload?.payment?.entity;
    const eventId = request.headers.get("x-razorpay-event-id");
    if (
      !eventId ||
      !payment?.id ||
      !payment.order_id ||
      typeof payment.amount !== "number" ||
      !payment.currency
    ) {
      return NextResponse.json(
        { error: "Incomplete Razorpay webhook payload." },
        { status: 400 },
      );
    }
    const result = await processRazorpayWebhook({
      eventId,
      event,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
    });
    void publishPaymentLifecycleNotifications(result).catch((error) =>
      console.error("In-app notification dispatch failed", error),
    );
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof RazorpayConfigurationError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof PaymentFlowError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json(
      { error: "Unable to process webhook." },
      { status: 500 },
    );
  }
}

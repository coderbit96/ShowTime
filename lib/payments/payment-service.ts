import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Coupon, GroupBooking, Payment, Show } from "@/models";
import { createTicketForConfirmedBooking } from "@/lib/tickets/create-ticket";
import { getRazorpayClient, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { getActiveMembership } from "@/lib/memberships/membership-service";
import { creditWallet, pointsForBooking } from "@/lib/wallet/wallet-service";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
const createOrderSchema = z.object({
  bookingId: objectId,
  idempotencyKey: z.string().trim().min(16).max(128),
});

export class PaymentFlowError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

type PaymentOrderResult = {
  paymentId: string;
  bookingId: string;
  groupBookingId?: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

function toOrderResult(payment: {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  groupBooking?: mongoose.Types.ObjectId | null;
  gatewayOrderId: string;
  amount: number;
  currency: string;
}): PaymentOrderResult {
  return {
    paymentId: payment._id.toString(),
    bookingId: payment.booking.toString(),
    ...(payment.groupBooking
      ? { groupBookingId: payment.groupBooking.toString() }
      : {}),
    orderId: payment.gatewayOrderId,
    amount: payment.amount * 100,
    currency: payment.currency,
    keyId: getRazorpayKeyId(),
  };
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function createRazorpayOrderForBooking(
  userId: string,
  rawInput: z.input<typeof createOrderSchema>,
): Promise<PaymentOrderResult> {
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new PaymentFlowError(
      parsed.error.issues[0]?.message ?? "Invalid payment request.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const existing = await Payment.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean();
  if (existing) {
    if (existing.booking.toString() !== input.bookingId)
      throw new PaymentFlowError(
        "This idempotency key belongs to another payment.",
      );
    return toOrderResult(existing);
  }

  const booking = await Booking.findOne({
    _id: input.bookingId,
    user: userId,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!booking)
    throw new PaymentFlowError(
      "This pending booking is no longer available for payment.",
      409,
    );

  const activePayment = await Payment.findOne({
    booking: booking._id,
    status: { $in: ["CREATED", "PENDING", "SUCCESS"] },
  }).lean();
  if (activePayment) return toOrderResult(activePayment);

  const razorpay = getRazorpayClient();
  const gatewayOrder = await razorpay.orders.create({
    amount: booking.pricing.total * 100,
    currency: booking.pricing.currency,
    receipt: `booking_${booking._id.toString().slice(-20)}`,
    notes: { bookingId: booking._id.toString() },
  });

  try {
    const payment = await Payment.create({
      booking: booking._id,
      amount: booking.pricing.total,
      currency: booking.pricing.currency,
      gateway: "RAZORPAY",
      gatewayOrderId: gatewayOrder.id,
      status: "CREATED",
      idempotencyKey: input.idempotencyKey,
      ...(booking.groupBooking ? { groupBooking: booking.groupBooking } : {}),
    });
    return toOrderResult(payment);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedPayment = await Payment.findOne({
      booking: booking._id,
      status: { $in: ["CREATED", "PENDING", "SUCCESS"] },
    }).lean();
    if (racedPayment) return toOrderResult(racedPayment);
    throw new PaymentFlowError(
      "Unable to create a payment order. Please try again.",
      409,
    );
  }
}

export async function recordCheckoutSignature({
  userId,
  bookingId,
  orderId,
  paymentId,
  signature,
}: {
  userId: string;
  bookingId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  await connectToDatabase();
  const payment = await Payment.findOne({
    gatewayOrderId: orderId,
    booking: bookingId,
  })
    .populate({ path: "booking", select: "user pricing.total status" })
    .lean();
  if (!payment || !payment.booking || typeof payment.booking === "string")
    throw new PaymentFlowError("Payment order was not found.", 404);
  const booking = payment.booking as unknown as {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    status: string;
    pricing: { total: number };
  };
  if (booking.user.toString() !== userId || booking.status !== "PENDING")
    throw new PaymentFlowError(
      "This payment is not available for verification.",
      403,
    );
  if (payment.gatewayPaymentId && payment.gatewayPaymentId !== paymentId)
    throw new PaymentFlowError(
      "Payment ID does not match this payment order.",
      409,
    );
  const updated = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      gatewayOrderId: orderId,
      $or: [
        { gatewayPaymentId: { $exists: false } },
        { gatewayPaymentId: paymentId },
      ],
    },
    {
      $set: {
        gatewayPaymentId: paymentId,
        signature,
        status: "PENDING",
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!updated)
    throw new PaymentFlowError(
      "Payment verification conflicted with another payment.",
      409,
    );
  return { paymentId: updated._id.toString(), status: updated.status };
}

export type RazorpayWebhookPayment = {
  eventId: string;
  event: "payment.captured" | "payment.failed";
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  method?: string;
  errorCode?: string;
  errorDescription?: string;
};

function toPaymentMethod(method?: string) {
  switch (method?.toLowerCase()) {
    case "upi":
      return "UPI";
    case "card":
      return "CARD";
    case "netbanking":
      return "NET_BANKING";
    case "wallet":
      return "WALLET";
    default:
      return "OTHER";
  }
}

export async function processRazorpayWebhook(
  paymentEvent: RazorpayWebhookPayment,
) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: {
      processed: boolean;
      bookingId?: string;
      ticketId?: string;
      status?: string;
    } = {
      processed: false,
    };
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        gatewayOrderId: paymentEvent.orderId,
      })
        .session(session)
        .lean();
      if (!payment)
        throw new PaymentFlowError("Webhook order is unknown.", 404);
      if (
        payment.amount * 100 !== paymentEvent.amount ||
        payment.currency !== paymentEvent.currency
      ) {
        throw new PaymentFlowError(
          "Webhook amount does not match the payment order.",
          400,
        );
      }
      if (
        payment.gatewayPaymentId &&
        payment.gatewayPaymentId !== paymentEvent.paymentId
      )
        throw new PaymentFlowError(
          "Webhook payment ID does not match the payment order.",
          409,
        );

      const claimed = await Payment.findOneAndUpdate(
        { _id: payment._id, webhookEventIds: { $ne: paymentEvent.eventId } },
        { $addToSet: { webhookEventIds: paymentEvent.eventId } },
        { returnDocument: "after", session },
      ).lean();
      if (!claimed) return;

      if (paymentEvent.event === "payment.captured") {
        await Payment.updateOne(
          { _id: payment._id },
          {
            $set: {
              gatewayPaymentId: paymentEvent.paymentId,
              status: "SUCCESS",
              paidAt: new Date(),
              ...(paymentEvent.method
                ? { paymentMethod: toPaymentMethod(paymentEvent.method) }
                : {}),
              gatewayResponse: {
                eventId: paymentEvent.eventId,
                event: paymentEvent.event,
                receivedAt: new Date(),
              },
            },
          },
          { session },
        );
        const booking = await Booking.findOneAndUpdate(
          { _id: payment.booking, status: "PENDING" },
          { $set: { status: "CONFIRMED", confirmedAt: new Date() } },
          { returnDocument: "after", session },
        ).lean();
        if (!booking) {
          result = { processed: true, status: "PAYMENT_REQUIRES_REVIEW" };
          return;
        }
        if (booking.pricing.coupon) {
          await Coupon.updateOne(
            { _id: booking.pricing.coupon },
            { $inc: { usedCount: 1 } },
            { session },
          );
        }
        await Show.updateOne(
          { _id: booking.show },
          { $set: { "seatAvailability.$[seat].status": "BOOKED" } },
          {
            arrayFilters: [
              {
                "seat.seatId": {
                  $in: booking.seats.map((seat) => seat.seatId),
                },
              },
            ],
            session,
          },
        );
        if (payment.groupBooking) {
          const pendingBookings = await Booking.countDocuments({
            groupBooking: payment.groupBooking,
            status: "PENDING",
          }).session(session);
          await GroupBooking.updateOne(
            { _id: payment.groupBooking },
            {
              $set: {
                status: pendingBookings ? "PARTIALLY_PAID" : "PAID",
              },
            },
            { session },
          );
          await GroupBooking.updateOne(
            { _id: payment.groupBooking, "members.booking": booking._id },
            {
              $set: {
                "members.$.status": "PAID",
                "members.$.payment": payment._id,
              },
            },
            { session },
          );
        }
        const membership = await getActiveMembership(
          booking.user.toString(),
          session,
        );
        const plan = membership?.plan as
          { benefits?: { rewardMultiplier?: number } } | undefined;
        await creditWallet({
          userId: booking.user.toString(),
          points: pointsForBooking(
            booking.pricing.total,
            plan?.benefits?.rewardMultiplier ?? 1,
          ),
          source: "BOOKING",
          booking: booking._id,
          payment: payment._id,
          idempotencyKey: `booking-rewards:${booking._id}`,
          session,
          note: "Booking reward points",
        });
        const ticket = await createTicketForConfirmedBooking(
          booking._id.toString(),
          session,
        );
        result = {
          processed: true,
          bookingId: booking._id.toString(),
          ticketId: ticket.ticketId,
          status: "CONFIRMED",
        };
        return;
      }

      if (payment.status !== "SUCCESS") {
        await Payment.updateOne(
          { _id: payment._id },
          {
            $set: {
              gatewayPaymentId: paymentEvent.paymentId,
              status: "FAILED",
              failedAt: new Date(),
              ...(paymentEvent.method
                ? { paymentMethod: toPaymentMethod(paymentEvent.method) }
                : {}),
              gatewayResponse: {
                eventId: paymentEvent.eventId,
                event: paymentEvent.event,
                receivedAt: new Date(),
                ...(paymentEvent.errorCode
                  ? { errorCode: paymentEvent.errorCode }
                  : {}),
                ...(paymentEvent.errorDescription
                  ? { errorDescription: paymentEvent.errorDescription }
                  : {}),
              },
            },
          },
          { session },
        );
        await Booking.updateOne(
          { _id: payment.booking, status: "PENDING" },
          { $set: { status: "CANCELLED", cancelledAt: new Date() } },
          { session },
        );
        if (payment.groupBooking) {
          await GroupBooking.updateOne(
            { _id: payment.groupBooking, status: { $ne: "PAID" } },
            { $set: { status: "CHECKOUT_STARTED" } },
            { session },
          );
        }
        result = {
          processed: true,
          bookingId: payment.booking.toString(),
          status: "CANCELLED",
        };
      }
    });
    return result;
  } finally {
    await session.endSession();
  }
}

import mongoose from "mongoose";
import { z } from "zod";
import { WalletTopUp } from "@/models";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { getRazorpayClient, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { PaymentFlowError } from "@/lib/payments/payment-service";
import { creditWallet } from "./wallet-service";

const topUpSchema = z.object({
  amount: z.coerce.number().int().min(100).max(10_000),
  idempotencyKey: z.string().trim().min(16).max(128),
});

type WalletTopUpOrder = {
  topUpId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

function toOrderResult(topUp: {
  _id: mongoose.Types.ObjectId;
  gatewayOrderId: string;
  amount: number;
  currency: string;
}): WalletTopUpOrder {
  return {
    topUpId: topUp._id.toString(),
    orderId: topUp.gatewayOrderId,
    amount: topUp.amount * 100,
    currency: topUp.currency,
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

export async function createWalletTopUpOrder(
  userId: string,
  rawInput: z.input<typeof topUpSchema>,
) {
  const parsed = topUpSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new PaymentFlowError(
      parsed.error.issues[0]?.message ?? "Invalid wallet recharge request.",
    );
  const input = parsed.data;
  await connectToDatabase();

  const existing = await WalletTopUp.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean();
  if (existing) {
    if (existing.user.toString() !== userId || existing.amount !== input.amount)
      throw new PaymentFlowError(
        "This idempotency key belongs to another wallet recharge.",
        409,
      );
    return toOrderResult(existing);
  }

  const razorpay = getRazorpayClient();
  const gatewayOrder = await razorpay.orders.create({
    amount: input.amount * 100,
    currency: "INR",
    receipt: `wallet_${input.idempotencyKey.slice(-28)}`,
    notes: { type: "wallet_top_up", userId },
  });

  try {
    const topUp = await WalletTopUp.create({
      user: userId,
      amount: input.amount,
      currency: "INR",
      gatewayOrderId: gatewayOrder.id,
      idempotencyKey: input.idempotencyKey,
    });
    return toOrderResult(topUp);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedTopUp = await WalletTopUp.findOne({
      idempotencyKey: input.idempotencyKey,
      user: userId,
      amount: input.amount,
    }).lean();
    if (racedTopUp) return toOrderResult(racedTopUp);
    throw new PaymentFlowError(
      "Unable to start wallet recharge. Please try again.",
      409,
    );
  }
}

export async function recordWalletTopUpSignature({
  userId,
  orderId,
  paymentId,
  signature,
}: {
  userId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  await connectToDatabase();
  const topUp = await WalletTopUp.findOne({ gatewayOrderId: orderId }).lean();
  if (!topUp)
    throw new PaymentFlowError("Wallet recharge order was not found.", 404);
  if (topUp.user.toString() !== userId)
    throw new PaymentFlowError(
      "This wallet recharge is not available for verification.",
      403,
    );
  if (topUp.gatewayPaymentId && topUp.gatewayPaymentId !== paymentId)
    throw new PaymentFlowError(
      "Payment ID does not match this wallet recharge.",
      409,
    );

  const updated = await WalletTopUp.findOneAndUpdate(
    {
      _id: topUp._id,
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
        ...(topUp.status === "CREATED" ? { status: "PENDING" } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!updated)
    throw new PaymentFlowError(
      "Wallet recharge verification conflicted with another payment.",
      409,
    );
  return { topUpId: updated._id.toString(), status: updated.status };
}

export async function processWalletTopUpWebhook({
  eventId,
  event,
  paymentId,
  orderId,
  amount,
  currency,
}: {
  eventId: string;
  event: "payment.captured" | "payment.failed";
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
}) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: { processed: boolean; topUpId?: string; status?: string } = {
      processed: false,
    };
    await session.withTransaction(async () => {
      const topUp = await WalletTopUp.findOne({ gatewayOrderId: orderId })
        .session(session)
        .lean();
      if (!topUp) throw new PaymentFlowError("Webhook order is unknown.", 404);
      if (topUp.amount * 100 !== amount || topUp.currency !== currency)
        throw new PaymentFlowError(
          "Webhook amount does not match the wallet recharge.",
          400,
        );
      if (topUp.gatewayPaymentId && topUp.gatewayPaymentId !== paymentId)
        throw new PaymentFlowError(
          "Webhook payment ID does not match the wallet recharge.",
          409,
        );

      const claimed = await WalletTopUp.findOneAndUpdate(
        { _id: topUp._id, webhookEventIds: { $ne: eventId } },
        { $addToSet: { webhookEventIds: eventId } },
        { returnDocument: "after", session },
      ).lean();
      if (!claimed) return;

      if (event === "payment.captured") {
        await WalletTopUp.updateOne(
          { _id: topUp._id },
          {
            $set: {
              gatewayPaymentId: paymentId,
              status: "SUCCESS",
              paidAt: new Date(),
            },
          },
          { session },
        );
        await creditWallet({
          userId: topUp.user.toString(),
          amount: topUp.amount,
          source: "TOP_UP",
          idempotencyKey: `wallet-top-up:${topUp._id.toString()}`,
          note: "Razorpay wallet recharge",
          session,
        });
        result = {
          processed: true,
          topUpId: topUp._id.toString(),
          status: "SUCCESS",
        };
        return;
      }

      if (topUp.status !== "SUCCESS") {
        await WalletTopUp.updateOne(
          { _id: topUp._id },
          {
            $set: {
              gatewayPaymentId: paymentId,
              status: "FAILED",
              failedAt: new Date(),
            },
          },
          { session },
        );
      }
      result = {
        processed: true,
        topUpId: topUp._id.toString(),
        status: topUp.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

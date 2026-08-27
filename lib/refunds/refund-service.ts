import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { getRazorpayClient } from "@/lib/payments/razorpay";
import { Booking, Payment, Refund, Setting, Show, Ticket } from "@/models";
import { createLifecycleNotification } from "@/lib/notifications/create-notification";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");

const cancellationPolicySchema = z.object({
  fullRefundHours: z.number().min(0).max(720).default(24),
  partialRefundHours: z.number().min(0).max(720).default(2),
  partialRefundPercent: z.number().min(0).max(100).default(50),
});

const defaultCancellationPolicy = {
  fullRefundHours: 24,
  partialRefundHours: 2,
  partialRefundPercent: 50,
} as const;

export type CancellationPolicy = z.infer<typeof cancellationPolicySchema>;

export class RefundFlowError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function getCancellationPolicy(): Promise<CancellationPolicy> {
  await connectToDatabase();
  const setting = await Setting.findOne({ key: "cancellation_policy" })
    .select("value")
    .lean();
  const parsed = cancellationPolicySchema.safeParse(setting?.value);
  return parsed.success ? parsed.data : defaultCancellationPolicy;
}

export function calculateCancellationRefund(
  startTime: Date,
  paidAmount: number,
  policy: CancellationPolicy,
) {
  const hoursUntilShow = (startTime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilShow >= policy.fullRefundHours) {
    return {
      eligible: true,
      amount: paidAmount,
      policyApplied: `Full refund: cancelled ${policy.fullRefundHours}+ hours before the show.`,
    };
  }
  if (hoursUntilShow >= policy.partialRefundHours) {
    const amount = Math.round((paidAmount * policy.partialRefundPercent) / 100);
    return {
      eligible: amount > 0,
      amount,
      policyApplied: `${policy.partialRefundPercent}% refund: cancelled ${policy.partialRefundHours}+ hours before the show.`,
    };
  }
  return {
    eligible: false,
    amount: 0,
    policyApplied:
      "This booking is within the cancellation window and is not refundable.",
  };
}

const refundRequestSchema = z.object({
  bookingId: objectId,
  idempotencyKey: z.string().trim().min(16).max(128),
  manualReview: z.boolean().optional().default(false),
  reason: z.string().trim().min(3).max(500).optional(),
});

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function requestRefund(
  userId: string,
  input: z.input<typeof refundRequestSchema>,
) {
  const parsed = refundRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new RefundFlowError(
      parsed.error.issues[0]?.message ?? "Invalid refund request.",
    );
  await connectToDatabase();

  const existingByKey = await Refund.findOne({
    idempotencyKey: parsed.data.idempotencyKey,
  }).lean();
  if (existingByKey) {
    if (existingByKey.booking.toString() !== parsed.data.bookingId)
      throw new RefundFlowError(
        "This idempotency key belongs to another refund request.",
        409,
      );
    return { refund: existingByKey, replayed: true };
  }

  const session = await mongoose.startSession();
  try {
    let createdId: string | null = null;
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: parsed.data.bookingId,
        user: userId,
        status: "CONFIRMED",
      })
        .session(session)
        .lean();
      if (!booking)
        throw new RefundFlowError(
          "Only confirmed bookings can be cancelled or refunded.",
          409,
        );

      const [show, payment, checkedInTicket, policy] = await Promise.all([
        Show.findById(booking.show).session(session).select("startTime").lean(),
        Payment.findOne({ booking: booking._id, status: "SUCCESS" })
          .session(session)
          .lean(),
        Ticket.exists({ booking: booking._id, checkedIn: true }).session(
          session,
        ),
        getCancellationPolicy(),
      ]);
      if (!show || !payment)
        throw new RefundFlowError(
          "This booking cannot be refunded because its payment is incomplete.",
          409,
        );
      if (checkedInTicket)
        throw new RefundFlowError(
          "Checked-in tickets cannot be cancelled.",
          409,
        );

      const calculation = calculateCancellationRefund(
        show.startTime,
        booking.pricing.total,
        policy,
      );
      if (!calculation.eligible && !parsed.data.manualReview)
        throw new RefundFlowError(calculation.policyApplied, 409);

      const activeRefund = await Refund.exists({
        booking: booking._id,
        status: {
          $in: [
            "REQUESTED",
            "UNDER_REVIEW",
            "APPROVED",
            "PROCESSING",
            "REFUNDED",
            "SUCCESS",
          ],
        },
      }).session(session);
      if (activeRefund)
        throw new RefundFlowError(
          "A refund already exists for this booking.",
          409,
        );

      const [refund] = await Refund.create(
        [
          {
            booking: booking._id,
            payment: payment._id,
            requestedAmount: calculation.eligible
              ? calculation.amount
              : booking.pricing.total,
            cancellationFee: Math.max(
              0,
              booking.pricing.total -
                (calculation.eligible
                  ? calculation.amount
                  : booking.pricing.total),
            ),
            reason: parsed.data.reason ?? "Customer cancellation",
            status: "REQUESTED",
            cancellationPolicyApplied: calculation.eligible
              ? calculation.policyApplied
              : "Manual exception review requested outside the standard cancellation policy.",
            idempotencyKey: parsed.data.idempotencyKey,
          },
        ],
        { session },
      );
      const transitioned = await Booking.updateOne(
        { _id: booking._id, status: "CONFIRMED" },
        { $set: { status: "REFUND_PENDING" } },
        { session },
      );
      if (transitioned.modifiedCount !== 1)
        throw new RefundFlowError("Booking status changed. Try again.", 409);
      createdId = refund._id.toString();
    });
    if (!createdId)
      throw new RefundFlowError("Unable to create refund request.", 409);
    const created = await Refund.findById(createdId).lean();
    if (!created)
      throw new RefundFlowError("Unable to create refund request.", 409);
    return { refund: created, replayed: false };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const activeRefund = await Refund.findOne({
        booking: parsed.data.bookingId,
        status: {
          $in: [
            "REQUESTED",
            "UNDER_REVIEW",
            "APPROVED",
            "PROCESSING",
            "REFUNDED",
            "SUCCESS",
          ],
        },
      }).lean();
      if (activeRefund)
        throw new RefundFlowError(
          "A refund already exists for this booking.",
          409,
        );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

type GatewayRefund = { id: string };
type GatewayRefundExecutor = (input: {
  paymentId: string;
  amountInPaise: number;
  refundId: string;
}) => Promise<GatewayRefund>;

const razorpayRefundExecutor: GatewayRefundExecutor = async ({
  paymentId,
  amountInPaise,
  refundId,
}) => {
  const result = await getRazorpayClient().payments.refund(paymentId, {
    amount: amountInPaise,
    notes: { refundId },
  });
  return { id: result.id };
};

function validRefundAmount(amount: number | undefined) {
  return (
    amount === undefined ||
    (typeof amount === "number" && Number.isFinite(amount) && amount >= 0)
  );
}

export async function approveRefund(
  adminId: string,
  refundId: string,
  approvedAmount?: number,
  executeGatewayRefund: GatewayRefundExecutor = razorpayRefundExecutor,
  adminNote?: string,
) {
  if (!objectId.safeParse(refundId).success)
    throw new RefundFlowError("Invalid refund ID.");
  if (!validRefundAmount(approvedAmount))
    throw new RefundFlowError(
      "Approved amount must be a valid positive amount.",
    );
  await connectToDatabase();

  const requested = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ["REQUESTED", "UNDER_REVIEW"] } },
    {
      $set: {
        status: "PROCESSING",
        adminApprover: adminId,
        reviewedAt: new Date(),
        ...(approvedAmount === undefined ? {} : { approvedAmount }),
        ...(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!requested) {
    const existing = await Refund.findById(refundId).lean();
    if (existing?.status === "REFUNDED" || existing?.status === "SUCCESS")
      return { refund: existing, replayed: true };
    throw new RefundFlowError(
      "This refund is no longer awaiting approval.",
      409,
    );
  }
  const amount = approvedAmount ?? requested.requestedAmount;
  if (amount < 0 || amount > requested.requestedAmount) {
    await Refund.updateOne(
      { _id: requested._id },
      { $set: { status: "UNDER_REVIEW" } },
    );
    throw new RefundFlowError(
      "Approved amount must be within the requested amount.",
    );
  }

  const payment = await Payment.findOne({
    _id: requested.payment,
    status: "SUCCESS",
  }).lean();
  if (!payment?.gatewayPaymentId) {
    await Refund.updateOne(
      { _id: requested._id },
      {
        $set: {
          status: "FAILED",
          failureReason: "The successful gateway payment was not found.",
        },
      },
    );
    throw new RefundFlowError(
      "The successful gateway payment was not found.",
      409,
    );
  }

  let gatewayRefund: GatewayRefund;
  try {
    gatewayRefund = await executeGatewayRefund({
      paymentId: payment.gatewayPaymentId,
      amountInPaise: Math.round(amount * 100),
      refundId: requested._id.toString(),
    });
  } catch (error) {
    await Refund.updateOne(
      { _id: requested._id, status: "PROCESSING" },
      {
        $set: {
          status: "FAILED",
          failureReason:
            error instanceof Error ? error.message : "Gateway refund failed.",
        },
      },
    );
    await Booking.updateOne(
      { _id: requested.booking, status: "REFUND_PENDING" },
      { $set: { status: "CONFIRMED" } },
    );
    throw new RefundFlowError(
      error instanceof Error ? error.message : "Gateway refund failed.",
      502,
    );
  }

  const session = await mongoose.startSession();
  try {
    let customerId = "";
    await session.withTransaction(async () => {
      const refund = await Refund.findOneAndUpdate(
        { _id: requested._id, status: "PROCESSING" },
        {
          $set: {
            status: "REFUNDED",
            approvedAmount: amount,
            gatewayRefundId: gatewayRefund.id,
            processedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      ).lean();
      if (!refund) return;
      const booking = await Booking.findOneAndUpdate(
        { _id: refund.booking, status: "REFUND_PENDING" },
        { $set: { status: "REFUNDED", cancelledAt: new Date() } },
        { returnDocument: "after", session },
      ).lean();
      if (!booking)
        throw new RefundFlowError("Booking status changed during refund.", 409);
      customerId = booking.user.toString();
      await Payment.updateOne(
        { _id: refund.payment, status: "SUCCESS" },
        { $set: { status: "REFUNDED" } },
        { session },
      );
      await Show.updateOne(
        { _id: booking.show },
        { $set: { "seatAvailability.$[seat].status": "AVAILABLE" } },
        {
          arrayFilters: [
            {
              "seat.seatId": { $in: booking.seats.map((seat) => seat.seatId) },
            },
          ],
          session,
        },
      );
    });
    if (customerId) {
      await createLifecycleNotification({
        userId: customerId,
        eventKey: `refund-processed:${requested._id.toString()}`,
        type: "REFUND",
        title: "Refund processed",
        body: `Your refund of INR ${amount} has been processed.`,
        metadata: { refundId: requested._id.toString(), amount },
      });
    }
    return {
      refundId: requested._id.toString(),
      gatewayRefundId: gatewayRefund.id,
      replayed: false,
    };
  } finally {
    await session.endSession();
  }
}

export async function markRefundUnderReview(
  adminId: string,
  refundId: string,
  adminNote?: string,
) {
  if (!objectId.safeParse(refundId).success)
    throw new RefundFlowError("Invalid refund ID.");
  await connectToDatabase();
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: "REQUESTED" },
    {
      $set: {
        status: "UNDER_REVIEW",
        adminApprover: adminId,
        reviewedAt: new Date(),
        ...(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!refund)
    throw new RefundFlowError("This refund is no longer awaiting review.", 409);
  return refund;
}

export async function saveRefundNote(
  adminId: string,
  refundId: string,
  adminNote: string,
) {
  if (!objectId.safeParse(refundId).success)
    throw new RefundFlowError("Invalid refund ID.");
  const note = adminNote.trim();
  if (!note) throw new RefundFlowError("Enter a refund note.");
  await connectToDatabase();
  const refund = await Refund.findByIdAndUpdate(
    refundId,
    { $set: { adminApprover: adminId, adminNote: note } },
    { returnDocument: "after" },
  ).lean();
  if (!refund) throw new RefundFlowError("Refund request was not found.", 404);
  return refund;
}

export async function rejectRefund(
  adminId: string,
  refundId: string,
  adminNote?: string,
) {
  if (!objectId.safeParse(refundId).success)
    throw new RefundFlowError("Invalid refund ID.");
  await connectToDatabase();
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ["REQUESTED", "UNDER_REVIEW"] } },
    {
      $set: {
        status: "REJECTED",
        adminApprover: adminId,
        reviewedAt: new Date(),
        ...(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!refund)
    throw new RefundFlowError(
      "This refund is no longer awaiting approval.",
      409,
    );
  await Booking.updateOne(
    { _id: refund.booking, status: "REFUND_PENDING" },
    { $set: { status: "CONFIRMED" } },
  );
  return refund;
}

export async function retryFailedRefund(
  adminId: string,
  refundId: string,
  approvedAmount?: number,
  adminNote?: string,
) {
  if (!objectId.safeParse(refundId).success)
    throw new RefundFlowError("Invalid refund ID.");
  if (!validRefundAmount(approvedAmount))
    throw new RefundFlowError(
      "Approved amount must be a valid positive amount.",
    );
  await connectToDatabase();
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: "FAILED" },
    {
      $set: {
        status: "UNDER_REVIEW",
        adminApprover: adminId,
        reviewedAt: new Date(),
        failureReason: undefined,
        ...(adminNote?.trim() ? { adminNote: adminNote.trim() } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!refund)
    throw new RefundFlowError("Only failed refunds can be retried.", 409);
  const booking = await Booking.findOneAndUpdate(
    { _id: refund.booking, status: "CONFIRMED" },
    { $set: { status: "REFUND_PENDING" } },
    { returnDocument: "after" },
  ).lean();
  if (!booking) {
    await Refund.updateOne({ _id: refund._id }, { $set: { status: "FAILED" } });
    throw new RefundFlowError(
      "Booking status changed during refund retry.",
      409,
    );
  }
  return approveRefund(
    adminId,
    refundId,
    approvedAmount ?? refund.approvedAmount ?? refund.requestedAmount,
    undefined,
    adminNote,
  );
}

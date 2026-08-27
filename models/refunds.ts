import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const RefundSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0 },
    cancellationFee: { type: Number, min: 0, default: 0 },
    reason: {
      type: String,
      required: true,
      trim: true,
      default: "Customer cancellation",
    },
    refundMethod: {
      type: String,
      enum: ["ORIGINAL_PAYMENT_METHOD"],
      default: "ORIGINAL_PAYMENT_METHOD",
    },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "UNDER_REVIEW",
        "APPROVED",
        "PROCESSING",
        "REFUNDED",
        // Retained for legacy records created before the REFUNDED status.
        "SUCCESS",
        "REJECTED",
        "FAILED",
      ],
      default: "REQUESTED",
      index: true,
    },
    cancellationPolicyApplied: { type: String, required: true, trim: true },
    adminApprover: { type: Schema.Types.ObjectId, ref: "User", index: true },
    idempotencyKey: { type: String, required: true, trim: true },
    gatewayRefundId: { type: String, trim: true },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    failureReason: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

RefundSchema.index({ idempotencyKey: 1 }, { unique: true });
RefundSchema.index(
  { booking: 1 },
  {
    unique: true,
    partialFilterExpression: {
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
    },
    name: "unique_active_refund_per_booking",
  },
);
RefundSchema.index({ booking: 1, status: 1 });
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ adminApprover: 1, status: 1 });
RefundSchema.index({ payment: 1, status: 1 });

export interface IRefund extends InferSchemaType<typeof RefundSchema> {}

export const Refund = getModel<IRefund>("Refund", RefundSchema, "refunds");

export default Refund;

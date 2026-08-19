import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const PaymentSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    gateway: { type: String, enum: ["RAZORPAY"], default: "RAZORPAY" },
    gatewayOrderId: { type: String, required: true, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "CREATED",
      index: true,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    paidAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true },
);

PaymentSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ gatewayOrderId: 1 }, { unique: true });
PaymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ booking: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

export interface IPayment extends InferSchemaType<typeof PaymentSchema> {}

export const Payment = getModel<IPayment>("Payment", PaymentSchema, "payments");

export default Payment;

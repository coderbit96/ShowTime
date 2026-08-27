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
    groupBooking: {
      type: Schema.Types.ObjectId,
      ref: "GroupBooking",
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    gateway: { type: String, enum: ["RAZORPAY"], default: "RAZORPAY" },
    gatewayOrderId: { type: String, required: true, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: ["UPI", "CARD", "NET_BANKING", "WALLET", "OTHER"],
      index: true,
    },
    gatewayResponse: {
      eventId: { type: String, trim: true },
      event: { type: String, trim: true },
      receivedAt: { type: Date },
      errorCode: { type: String, trim: true },
      errorDescription: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "CREATED",
      index: true,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    paidAt: { type: Date },
    failedAt: { type: Date },
    webhookEventIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

PaymentSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ gatewayOrderId: 1 }, { unique: true });
PaymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ booking: 1, status: 1 });
PaymentSchema.index({ groupBooking: 1, status: 1 });
PaymentSchema.index(
  { booking: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["CREATED", "PENDING", "SUCCESS"] },
    },
    name: "unique_active_payment_per_booking",
  },
);
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ paymentMethod: 1, createdAt: -1 });

export interface IPayment extends InferSchemaType<typeof PaymentSchema> {}

export const Payment = getModel<IPayment>("Payment", PaymentSchema, "payments");

export default Payment;

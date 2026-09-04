import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const WalletTopUpSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 100, max: 10_000 },
    currency: { type: String, default: "INR" },
    gateway: { type: String, enum: ["RAZORPAY"], default: "RAZORPAY" },
    gatewayOrderId: { type: String, required: true, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "SUCCESS", "FAILED"],
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

WalletTopUpSchema.index({ idempotencyKey: 1 }, { unique: true });
WalletTopUpSchema.index({ gatewayOrderId: 1 }, { unique: true });
WalletTopUpSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, sparse: true },
);
WalletTopUpSchema.index({ user: 1, status: 1, createdAt: -1 });

export interface IWalletTopUp extends InferSchemaType<
  typeof WalletTopUpSchema
> {}

export const WalletTopUp = getModel<IWalletTopUp>(
  "WalletTopUp",
  WalletTopUpSchema,
  "walletTopUps",
);

export default WalletTopUp;

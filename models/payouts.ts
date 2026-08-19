import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const PayoutSchema = new Schema(
  {
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PAID", "FAILED", "ON_HOLD"],
      default: "PENDING",
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    transferReference: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

PayoutSchema.index({ organizer: 1, status: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });
PayoutSchema.index({ periodStart: 1, periodEnd: 1 });

export interface IPayout extends InferSchemaType<typeof PayoutSchema> {}

export const Payout = getModel<IPayout>("Payout", PayoutSchema, "payouts");

export default Payout;

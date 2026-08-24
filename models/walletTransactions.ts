import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const WalletTransactionSchema = new Schema(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    foodOrder: { type: Schema.Types.ObjectId, ref: "FoodOrder", index: true },
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT", "REWARD_EARN", "REWARD_REDEEM", "REFUND"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: [
        "TOP_UP",
        "BOOKING",
        "REFERRAL",
        "REWARD",
        "REFUND",
        "FOOD",
        "MEMBERSHIP",
        "ADMIN",
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    pointsAfter: { type: Number, required: true, min: 0 },
    idempotencyKey: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

WalletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
WalletTransactionSchema.index({ user: 1, createdAt: -1 });
WalletTransactionSchema.index({ booking: 1, source: 1 });
WalletTransactionSchema.index({ source: 1, createdAt: -1 });

export interface IWalletTransaction extends InferSchemaType<
  typeof WalletTransactionSchema
> {}

export const WalletTransaction = getModel<IWalletTransaction>(
  "WalletTransaction",
  WalletTransactionSchema,
  "walletTransactions",
);

export default WalletTransaction;

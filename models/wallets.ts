import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const WalletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    rewardPoints: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

WalletSchema.index({ user: 1 }, { unique: true });
WalletSchema.index({ status: 1, updatedAt: -1 });

export interface IWallet extends InferSchemaType<typeof WalletSchema> {}

export const Wallet = getModel<IWallet>("Wallet", WalletSchema, "wallets");

export default Wallet;

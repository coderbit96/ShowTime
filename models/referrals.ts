import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const ReferralSchema = new Schema(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUser: { type: Schema.Types.ObjectId, ref: "User" },
    code: { type: String, required: true, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ["INVITED", "SIGNED_UP", "REWARDED", "EXPIRED"],
      default: "INVITED",
      index: true,
    },
    rewardPoints: { type: Number, default: 250, min: 0 },
    rewardAmount: { type: Number, default: 0, min: 0 },
    rewardedAt: { type: Date },
    idempotencyKey: { type: String, trim: true },
  },
  { timestamps: true },
);

ReferralSchema.index({ code: 1 }, { unique: true });
ReferralSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
ReferralSchema.index({ referrer: 1, createdAt: -1 });
ReferralSchema.index({ referredUser: 1 }, { unique: true, sparse: true });

export interface IReferral extends InferSchemaType<typeof ReferralSchema> {}

export const Referral = getModel<IReferral>(
  "Referral",
  ReferralSchema,
  "referrals",
);

export default Referral;

import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const WalletPassTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    passType: {
      type: String,
      enum: ["MEMBERSHIP", "EVENT", "MOVIE", "FOOD", "OFFER"],
      required: true,
      index: true,
    },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const WalletPassSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: "WalletPassTemplate",
      index: true,
    },
    membership: {
      type: Schema.Types.ObjectId,
      ref: "MembershipSubscription",
      index: true,
    },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    passId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "REVOKED"],
      default: "ACTIVE",
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

WalletPassTemplateSchema.index({ slug: 1 }, { unique: true });
WalletPassSchema.index({ passId: 1 }, { unique: true });
WalletPassSchema.index({ user: 1, status: 1, expiresAt: 1 });
WalletPassSchema.index({ expiresAt: 1 });

export interface IWalletPassTemplate extends InferSchemaType<
  typeof WalletPassTemplateSchema
> {}
export interface IWalletPass extends InferSchemaType<typeof WalletPassSchema> {}

export const WalletPassTemplate = getModel<IWalletPassTemplate>(
  "WalletPassTemplate",
  WalletPassTemplateSchema,
  "walletPassTemplates",
);

export const WalletPass = getModel<IWalletPass>(
  "WalletPass",
  WalletPassSchema,
  "walletPasses",
);

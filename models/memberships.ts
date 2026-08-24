import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const BenefitSchema = new Schema(
  {
    rewardMultiplier: { type: Number, default: 1, min: 1 },
    bookingDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    foodDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    freeCancellation: { type: Boolean, default: false },
    priorityAccess: { type: Boolean, default: false },
  },
  { _id: false },
);

const MembershipPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    benefits: { type: BenefitSchema, default: () => ({}) },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const MembershipSubscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    idempotencyKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

MembershipPlanSchema.index({ slug: 1 }, { unique: true });
MembershipPlanSchema.index({ active: 1, price: 1 });
MembershipSubscriptionSchema.index({ idempotencyKey: 1 }, { unique: true });
MembershipSubscriptionSchema.index({ user: 1, status: 1, endsAt: -1 });

export interface IMembershipPlan extends InferSchemaType<
  typeof MembershipPlanSchema
> {}
export interface IMembershipSubscription extends InferSchemaType<
  typeof MembershipSubscriptionSchema
> {}

export const MembershipPlan = getModel<IMembershipPlan>(
  "MembershipPlan",
  MembershipPlanSchema,
  "membershipPlans",
);

export const MembershipSubscription = getModel<IMembershipSubscription>(
  "MembershipSubscription",
  MembershipSubscriptionSchema,
  "membershipSubscriptions",
);

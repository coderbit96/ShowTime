import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    discountType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minimumCartAmount: { type: Number, required: true, min: 0, default: 0 },
    maximumDiscount: { type: Number, min: 0 },
    startDate: { type: Date, required: true, index: true },
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, required: true, min: 1, default: 1 },
    applicableEvents: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ active: 1, startDate: 1, expiryDate: 1 });
CouponSchema.index({ applicableEvents: 1, active: 1 });
CouponSchema.index({ applicableCategories: 1, active: 1 });

export interface ICoupon extends InferSchemaType<typeof CouponSchema> {}

export const Coupon = getModel<ICoupon>("Coupon", CouponSchema, "coupons");

export default Coupon;

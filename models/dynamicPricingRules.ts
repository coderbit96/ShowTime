import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const DynamicPricingRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    scope: {
      type: String,
      enum: ["GLOBAL", "CITY", "CATEGORY", "EVENT", "MOVIE", "SHOW"],
      required: true,
      index: true,
    },
    city: { type: Schema.Types.ObjectId, ref: "City", index: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    show: { type: Schema.Types.ObjectId, ref: "Show", index: true },
    seatCategory: {
      type: String,
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    multiplier: { type: Number, default: 1, min: 0 },
    flatAdjustment: { type: Number, default: 0 },
    priority: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

DynamicPricingRuleSchema.index({
  active: 1,
  scope: 1,
  startsAt: 1,
  endsAt: 1,
  priority: -1,
});
DynamicPricingRuleSchema.index({ show: 1, active: 1, startsAt: 1 });

export interface IDynamicPricingRule extends InferSchemaType<
  typeof DynamicPricingRuleSchema
> {}

export const DynamicPricingRule = getModel<IDynamicPricingRule>(
  "DynamicPricingRule",
  DynamicPricingRuleSchema,
  "dynamicPricingRules",
);

export default DynamicPricingRule;

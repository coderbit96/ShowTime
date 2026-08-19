import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const BannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    linkUrl: { type: String, trim: true },
    city: { type: Schema.Types.ObjectId, ref: "City", index: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    placement: {
      type: String,
      enum: ["HOME_HERO", "HOME_SECTION", "CATEGORY", "CITY"],
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

BannerSchema.index({ placement: 1, city: 1, active: 1, sortOrder: 1 });
BannerSchema.index({ category: 1, active: 1 });
BannerSchema.index({ startDate: 1, endDate: 1, active: 1 });

export interface IBanner extends InferSchemaType<typeof BannerSchema> {}

export const Banner = getModel<IBanner>("Banner", BannerSchema, "banners");

export default Banner;

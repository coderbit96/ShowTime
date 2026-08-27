import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const CitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    image: { type: String, trim: true },
    featured: { type: Boolean, default: false, index: true },
    aliases: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true },
);

CitySchema.index({ slug: 1 }, { unique: true });
CitySchema.index({ name: 1, state: 1 });
CitySchema.index({ active: 1, featured: 1, name: 1 });
CitySchema.index({ aliases: 1, active: 1 });
CitySchema.index({ location: "2dsphere" });

export interface ICity extends InferSchemaType<typeof CitySchema> {}

export const City = getModel<ICity>("City", CitySchema, "cities");

export default City;

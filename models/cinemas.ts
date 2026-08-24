import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const CinemaSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: "text" },
    slug: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
    chain: { type: String, trim: true, index: true },
    amenities: { type: [String], default: [] },
    contact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

CinemaSchema.index({ slug: 1 }, { unique: true });
CinemaSchema.index({ city: 1, active: 1 });
CinemaSchema.index({ location: "2dsphere" });

export interface ICinema extends InferSchemaType<typeof CinemaSchema> {}

export const Cinema = getModel<ICinema>("Cinema", CinemaSchema, "cinemas");

export default Cinema;

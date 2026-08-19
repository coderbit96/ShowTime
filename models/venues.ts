import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const VenueSchema = new Schema(
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
    capacity: { type: Number, min: 0 },
    amenities: { type: [String], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

VenueSchema.index({ slug: 1 }, { unique: true });
VenueSchema.index({ city: 1, active: 1 });
VenueSchema.index({ location: "2dsphere" });

export interface IVenue extends InferSchemaType<typeof VenueSchema> {}

export const Venue = getModel<IVenue>("Venue", VenueSchema, "venues");

export default Venue;

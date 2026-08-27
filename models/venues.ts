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
    parkingAvailable: { type: Boolean, default: false },
    seatingType: {
      type: String,
      enum: ["FIXED", "FLEXIBLE", "STANDING", "MIXED"],
      default: "FIXED",
    },
    venueType: {
      type: String,
      enum: [
        "AUDITORIUM",
        "ARENA",
        "CLUB",
        "OPEN_AIR",
        "STADIUM",
        "THEATRE",
        "OTHER",
      ],
      default: "OTHER",
      index: true,
    },
    amenities: { type: [String], default: [] },
    contact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    images: { type: [String], default: [] },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Organizer", index: true },
    assignedOrganizer: {
      type: Schema.Types.ObjectId,
      ref: "Organizer",
      index: true,
    },
    operationalStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
      index: true,
    },
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
VenueSchema.index({ city: 1, approvalStatus: 1, venueType: 1, active: 1 });
VenueSchema.index({ createdBy: 1, approvalStatus: 1, active: 1 });
VenueSchema.index({ assignedOrganizer: 1, operationalStatus: 1, active: 1 });
VenueSchema.index({ location: "2dsphere" });

export interface IVenue extends InferSchemaType<typeof VenueSchema> {}

export const Venue = getModel<IVenue>("Venue", VenueSchema, "venues");

export default Venue;

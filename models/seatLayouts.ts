import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const SeatSchema = new Schema(
  {
    seatId: { type: String, required: true, trim: true },
    row: { type: String, required: true, trim: true },
    number: { type: Number, required: true },
    category: {
      type: String,
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const SeatRowSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    seats: { type: [SeatSchema], required: true },
  },
  { _id: false },
);

const SeatLayoutSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    rows: { type: [SeatRowSchema], required: true },
    categories: {
      type: [String],
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
      required: true,
    },
    totalSeats: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

SeatLayoutSchema.index({ name: 1 }, { unique: true });

export interface ISeatLayout extends InferSchemaType<typeof SeatLayoutSchema> {}

export const SeatLayout = getModel<ISeatLayout>(
  "SeatLayout",
  SeatLayoutSchema,
  "seatLayouts",
);

export default SeatLayout;

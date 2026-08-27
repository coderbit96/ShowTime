import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const PriceSchema = new Schema(
  {
    category: {
      type: String,
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false },
);

const SeatAvailabilitySchema = new Schema(
  {
    seatId: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
      required: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "LOCKED", "BOOKED", "BLOCKED"],
      default: "AVAILABLE",
      index: true,
    },
  },
  { _id: false },
);

const ShowSchema = new Schema(
  {
    contentType: { type: String, enum: ["MOVIE", "EVENT"], required: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    organizer: { type: Schema.Types.ObjectId, ref: "Organizer", index: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", index: true },
    cinema: { type: Schema.Types.ObjectId, ref: "Cinema", index: true },
    screen: {
      type: Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    bookingOpensAt: { type: Date, index: true },
    bookingClosesAt: { type: Date, index: true },
    pricing: { type: [PriceSchema], required: true },
    bookingLimits: {
      maxSeatsPerBooking: { type: Number, required: true, min: 1, default: 10 },
      maxBookings: { type: Number, min: 1 },
    },
    seatAvailability: { type: [SeatAvailabilitySchema], required: true },
    bookingStatus: {
      type: String,
      enum: ["SCHEDULED", "SOLD_OUT", "CANCELLED", "COMPLETED"],
      default: "SCHEDULED",
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ShowSchema.index({ screen: 1, startTime: 1 }, { unique: true });
ShowSchema.index({
  screen: 1,
  startTime: 1,
  endTime: 1,
  bookingStatus: 1,
  active: 1,
});
ShowSchema.index({ city: 1, category: 1, date: 1, bookingStatus: 1 });
ShowSchema.index({ movie: 1, city: 1, date: 1 });
ShowSchema.index({ event: 1, city: 1, date: 1 });
ShowSchema.index({ organizer: 1, bookingStatus: 1, date: -1 });
ShowSchema.index({ cinema: 1, date: 1 });
ShowSchema.index({ venue: 1, date: 1 });

export interface IShow extends InferSchemaType<typeof ShowSchema> {}

export const Show = getModel<IShow>("Show", ShowSchema, "shows");

export default Show;

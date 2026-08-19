import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const BookedSeatSchema = new Schema(
  {
    seatId: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["REGULAR", "PREMIUM", "RECLINER", "VIP"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PricingBreakdownSchema = new Schema(
  {
    basePrice: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false },
);

const BookingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    show: {
      type: Schema.Types.ObjectId,
      ref: "Show",
      required: true,
      index: true,
    },
    seats: { type: [BookedSeatSchema], required: true },
    pricing: { type: PricingBreakdownSchema, required: true },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "EXPIRED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    expiresAt: { type: Date },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

BookingSchema.index({ idempotencyKey: 1 }, { unique: true });
BookingSchema.index(
  { show: 1, "seats.seatId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "CONFIRMED", "REFUND_PENDING"] },
    },
    name: "unique_active_booking_per_show_seat",
  },
);
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ show: 1, status: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });

export interface IBooking extends InferSchemaType<typeof BookingSchema> {}

export const Booking = getModel<IBooking>("Booking", BookingSchema, "bookings");

export default Booking;

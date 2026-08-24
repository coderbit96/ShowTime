import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const GroupMemberSchema = new Schema(
  {
    email: { type: String, trim: true, lowercase: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, trim: true },
    status: {
      type: String,
      enum: ["INVITED", "JOINED", "DECLINED", "PAID"],
      default: "INVITED",
      index: true,
    },
    assignedSeats: { type: [String], default: [] },
    booking: { type: Schema.Types.ObjectId, ref: "Booking" },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
  },
  { _id: false },
);

const GroupBookingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    show: { type: Schema.Types.ObjectId, ref: "Show", index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    lock: { type: Schema.Types.ObjectId, ref: "SeatLock" },
    selectedSeats: { type: [String], default: [] },
    members: { type: [GroupMemberSchema], default: [] },
    paymentMode: {
      type: String,
      enum: ["PAY_TOGETHER", "SPLIT"],
      default: "PAY_TOGETHER",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "CREATED",
        "INVITING",
        "SEATS_SELECTED",
        "CHECKOUT_STARTED",
        "PARTIALLY_PAID",
        "PAID",
        "EXPIRED",
        "CANCELLED",
      ],
      default: "CREATED",
      index: true,
    },
    inviteToken: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

GroupBookingSchema.index({ idempotencyKey: 1 }, { unique: true });
GroupBookingSchema.index({ inviteToken: 1 }, { unique: true });
GroupBookingSchema.index({ creator: 1, createdAt: -1 });
GroupBookingSchema.index({ show: 1, status: 1 });
GroupBookingSchema.index({ "members.user": 1, createdAt: -1 });
GroupBookingSchema.index({ "members.email": 1, createdAt: -1 });
GroupBookingSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: { $in: ["CREATED", "INVITING"] } },
  },
);

export interface IGroupBooking extends InferSchemaType<
  typeof GroupBookingSchema
> {}

export const GroupBooking = getModel<IGroupBooking>(
  "GroupBooking",
  GroupBookingSchema,
  "groupBookings",
);

export default GroupBooking;

import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const SeatLockSchema = new Schema(
  {
    show: { type: Schema.Types.ObjectId, ref: "Show", required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seatIds: { type: [String], required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
  },
  { timestamps: true },
);

SeatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SeatLockSchema.index({ idempotencyKey: 1 }, { unique: true });
SeatLockSchema.index(
  { show: 1, seatIds: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
    name: "unique_active_lock_per_show_seat",
  },
);
SeatLockSchema.index({ show: 1, user: 1, status: 1 });

export interface ISeatLock extends InferSchemaType<typeof SeatLockSchema> {}

export const SeatLock = getModel<ISeatLock>(
  "SeatLock",
  SeatLockSchema,
  "seatLocks",
);

export default SeatLock;

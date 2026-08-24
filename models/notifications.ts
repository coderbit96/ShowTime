import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const NotificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["BOOKING", "PAYMENT", "REFUND", "EVENT", "SYSTEM"],
      required: true,
      index: true,
    },
    eventKey: { type: String, trim: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ eventKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ type: 1, createdAt: -1 });

export interface INotification extends InferSchemaType<
  typeof NotificationSchema
> {}

export const Notification = getModel<INotification>(
  "Notification",
  NotificationSchema,
  "notifications",
);

export default Notification;

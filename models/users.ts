import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "ORGANIZER", "ADMIN"],
      required: true,
      default: "CUSTOMER",
      index: true,
    },
    city: { type: Schema.Types.ObjectId, ref: "City", index: true },
    hiddenBookingIds: {
      type: [Schema.Types.ObjectId],
      ref: "Booking",
      default: [],
    },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ firebaseUid: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, active: 1 });

export interface IUser extends InferSchemaType<typeof UserSchema> {}

export const User = getModel<IUser>("User", UserSchema, "users");

export default User;

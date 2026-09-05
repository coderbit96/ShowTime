import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"],
    },
    address: {
      line1: { type: String, trim: true, maxlength: 160 },
      line2: { type: String, trim: true, maxlength: 160 },
      locality: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 20 },
      country: { type: String, trim: true, maxlength: 100 },
    },
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
    accountStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true,
    },
    blockedAt: { type: Date },
    blockReason: { type: String, trim: true, maxlength: 500 },
    accessResetAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ firebaseUid: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, active: 1 });
UserSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });

export interface IUser extends InferSchemaType<typeof UserSchema> {}

export const User = getModel<IUser>("User", UserSchema, "users");

export default User;

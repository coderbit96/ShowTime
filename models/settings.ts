import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, trim: true },
    scope: {
      type: String,
      enum: ["GLOBAL", "PAYMENT", "BOOKING", "NOTIFICATION"],
      default: "GLOBAL",
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

SettingSchema.index({ key: 1 }, { unique: true });
SettingSchema.index({ scope: 1, key: 1 });

export interface ISetting extends InferSchemaType<typeof SettingSchema> {}

export const Setting = getModel<ISetting>("Setting", SettingSchema, "settings");

export default Setting;

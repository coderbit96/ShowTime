import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const ScreenSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    cinema: { type: Schema.Types.ObjectId, ref: "Cinema", index: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", index: true },
    seatLayout: {
      type: Schema.Types.ObjectId,
      ref: "SeatLayout",
      required: true,
      index: true,
    },
    capacity: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ScreenSchema.index({ cinema: 1, name: 1 }, { unique: true, sparse: true });
ScreenSchema.index({ venue: 1, name: 1 }, { unique: true, sparse: true });
ScreenSchema.index({ cinema: 1, active: 1 });
ScreenSchema.index({ venue: 1, active: 1 });

export interface IScreen extends InferSchemaType<typeof ScreenSchema> {}

export const Screen = getModel<IScreen>("Screen", ScreenSchema, "screens");

export default Screen;

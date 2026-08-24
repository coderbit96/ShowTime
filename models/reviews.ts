import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const ReviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", index: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    comment: { type: String, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
  },
  { timestamps: true },
);

ReviewSchema.index({ event: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ movie: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ venue: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, event: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ user: 1, movie: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ user: 1, venue: 1 }, { unique: true, sparse: true });

export interface IReview extends InferSchemaType<typeof ReviewSchema> {}

export const Review = getModel<IReview>("Review", ReviewSchema, "reviews");

export default Review;

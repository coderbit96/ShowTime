import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: "text" },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    poster: { type: String, required: true, trim: true },
    banner: { type: String, trim: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
      index: true,
    },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
    eventType: {
      type: String,
      enum: [
        "MOVIE",
        "CONCERT",
        "COMEDY",
        "THEATRE",
        "SPORT",
        "WORKSHOP",
        "FESTIVAL",
        "GAMING",
        "EXHIBITION",
        "KIDS",
        "LOCAL",
        "COLLEGE",
        "ADVENTURE",
        "SPECIAL_EXPERIENCE",
      ],
      required: true,
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"],
      default: "DRAFT",
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

EventSchema.index({ slug: 1 }, { unique: true });
EventSchema.index({ city: 1, category: 1, startsAt: 1, status: 1 });
EventSchema.index({ organizer: 1, status: 1, startsAt: -1 });
EventSchema.index({ title: "text", description: "text" });

export interface IEvent extends InferSchemaType<typeof EventSchema> {}

export const Event = getModel<IEvent>("Event", EventSchema, "events");

export default Event;

import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const ArtistSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    image: { type: String, trim: true },
  },
  { _id: false },
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    poster: { type: String, required: true, trim: true },
    banner: { type: String, trim: true },
    gallery: { type: [String], default: [] },
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
    durationMinutes: { type: Number, min: 1 },
    language: { type: [String], default: [] },
    ageRestriction: { type: String, trim: true, default: "All ages" },
    artists: { type: [ArtistSchema], default: [] },
    rating: { type: Number, min: 0, max: 5 },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"],
      default: "DRAFT",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

EventSchema.index({ slug: 1 }, { unique: true });
EventSchema.index({ city: 1, category: 1, startsAt: 1, status: 1 });
EventSchema.index({ organizer: 1, status: 1, startsAt: -1 });
EventSchema.index({ approvalStatus: 1, status: 1, startsAt: -1 });
EventSchema.index({ title: "text", description: "text" });

export interface IEvent extends InferSchemaType<typeof EventSchema> {}

export const Event = getModel<IEvent>("Event", EventSchema, "events");

export default Event;

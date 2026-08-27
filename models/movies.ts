import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const PersonCreditSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    image: { type: String, trim: true },
  },
  { _id: false },
);

const MovieSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    poster: { type: String, required: true, trim: true },
    banner: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    language: { type: [String], required: true, index: true },
    genre: { type: [String], required: true, index: true },
    cast: { type: [PersonCreditSchema], default: [] },
    crew: { type: [PersonCreditSchema], default: [] },
    trailer: { type: String, trim: true },
    duration: { type: Number, required: true, min: 1 },
    certificate: { type: String, required: true, trim: true, index: true },
    releaseDate: { type: Date, required: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 10, index: true },
    formats: {
      type: [String],
      enum: ["2D", "3D", "IMAX", "4DX"],
      default: ["2D"],
    },
    availabilityStatus: {
      type: String,
      enum: ["NOW_SHOWING", "COMING_SOON"],
      default: "COMING_SOON",
      index: true,
    },
    trending: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

MovieSchema.index(
  {
    title: "text",
    description: "text",
    genre: "text",
    "cast.name": "text",
  },
  { language_override: "textLanguage" },
);
MovieSchema.index({ slug: 1 }, { unique: true });
MovieSchema.index({ releaseDate: -1, active: 1 });
MovieSchema.index({
  availabilityStatus: 1,
  featured: 1,
  trending: 1,
  active: 1,
});

export interface IMovie extends InferSchemaType<typeof MovieSchema> {}

export const Movie = getModel<IMovie>("Movie", MovieSchema, "movies");

export default Movie;

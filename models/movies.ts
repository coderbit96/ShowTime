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
    title: { type: String, required: true, trim: true, index: "text" },
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
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

MovieSchema.index({ title: "text", description: "text", genre: "text" });
MovieSchema.index({ releaseDate: -1, active: 1 });
MovieSchema.index({ language: 1, genre: 1 });

export interface IMovie extends InferSchemaType<typeof MovieSchema> {}

export const Movie = getModel<IMovie>("Movie", MovieSchema, "movies");

export default Movie;

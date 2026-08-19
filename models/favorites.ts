import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const FavoriteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", index: true },
  },
  { timestamps: true },
);

FavoriteSchema.index({ user: 1, event: 1 }, { unique: true, sparse: true });
FavoriteSchema.index({ user: 1, movie: 1 }, { unique: true, sparse: true });
FavoriteSchema.index({ user: 1, createdAt: -1 });

export interface IFavorite extends InferSchemaType<typeof FavoriteSchema> {}

export const Favorite = getModel<IFavorite>(
  "Favorite",
  FavoriteSchema,
  "favorites",
);

export default Favorite;

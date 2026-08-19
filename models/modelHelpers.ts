import mongoose, { type Model } from "mongoose";

export type ObjectId = mongoose.Types.ObjectId;

export function getModel<T>(
  name: string,
  schema: mongoose.Schema<T>,
  collection: string,
) {
  return (
    (mongoose.models[name] as Model<T> | undefined) ??
    mongoose.model<T>(name, schema, collection)
  );
}

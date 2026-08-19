import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ active: 1, sortOrder: 1 });

export interface ICategory extends InferSchemaType<typeof CategorySchema> {}

export const Category = getModel<ICategory>(
  "Category",
  CategorySchema,
  "categories",
);

export default Category;

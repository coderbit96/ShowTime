import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const FoodItemSchema = new Schema(
  {
    cinema: {
      type: Schema.Types.ObjectId,
      ref: "Cinema",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    category: {
      type: String,
      enum: ["SNACK", "BEVERAGE", "COMBO", "MEAL", "DESSERT"],
      default: "SNACK",
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    available: { type: Boolean, default: true, index: true },
    preparationMinutes: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true },
);

const FoodOrderLineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "FoodItem", required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const FoodOrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    cinema: {
      type: Schema.Types.ObjectId,
      ref: "Cinema",
      required: true,
      index: true,
    },
    show: { type: Schema.Types.ObjectId, ref: "Show", index: true },
    items: { type: [FoodOrderLineSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },
    deliveryMode: {
      type: String,
      enum: ["COUNTER_PICKUP", "SEAT_DELIVERY"],
      default: "COUNTER_PICKUP",
    },
    seatNumbers: { type: [String], default: [] },
    idempotencyKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

FoodItemSchema.index({ cinema: 1, available: 1, category: 1 });
FoodOrderSchema.index({ idempotencyKey: 1 }, { unique: true });
FoodOrderSchema.index({ user: 1, createdAt: -1 });
FoodOrderSchema.index({ booking: 1, status: 1 });
FoodOrderSchema.index({ cinema: 1, status: 1, createdAt: -1 });

export interface IFoodItem extends InferSchemaType<typeof FoodItemSchema> {}
export interface IFoodOrder extends InferSchemaType<typeof FoodOrderSchema> {}

export const FoodItem = getModel<IFoodItem>(
  "FoodItem",
  FoodItemSchema,
  "foodItems",
);

export const FoodOrder = getModel<IFoodOrder>(
  "FoodOrder",
  FoodOrderSchema,
  "foodOrders",
);

import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const TicketSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    ticketId: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    eventOrMovieName: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true },
    seatNumbers: { type: [String], required: true },
    ticketCategory: { type: String, required: true, trim: true },
    totalPayment: { type: Number, required: true, min: 0 },
    bookingStatus: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "EXPIRED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      required: true,
    },
    qrPayload: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    checkInStatus: {
      type: String,
      enum: ["VALID", "CHECKED_IN"],
      default: "VALID",
      index: true,
    },
  },
  { timestamps: true },
);

TicketSchema.index({ ticketId: 1 }, { unique: true });
TicketSchema.index({ booking: 1 }, { unique: true });
TicketSchema.index({ date: 1, bookingStatus: 1 });
TicketSchema.index({ checkedIn: 1, date: -1 });

export interface ITicket extends InferSchemaType<typeof TicketSchema> {}

export const Ticket = getModel<ITicket>("Ticket", TicketSchema, "tickets");

export default Ticket;

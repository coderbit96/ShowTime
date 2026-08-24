import mongoose from "mongoose";
import { Booking, Payment, Show, Ticket } from "@/models";
import type { ManagementUser } from "@/lib/auth/require-management-user";
import { verifyTicketQrPayload } from "@/lib/tickets/qr-token";

export type CheckInResult =
  | { outcome: "APPROVED"; ticketId: string; customerName: string }
  | { outcome: "ALREADY_USED"; checkedInAt?: Date }
  | { outcome: "INVALID"; reason: string };

export async function checkInTicket({
  actor,
  qrPayload,
  showId,
}: {
  actor: ManagementUser;
  qrPayload: string;
  showId?: string;
}): Promise<CheckInResult> {
  const claims = verifyTicketQrPayload(qrPayload);
  if (!claims)
    return { outcome: "INVALID", reason: "Invalid ticket signature." };
  const session = await mongoose.startSession();
  try {
    let result: CheckInResult = {
      outcome: "INVALID",
      reason: "Ticket validation failed.",
    };
    await session.withTransaction(async () => {
      const ticket = await Ticket.findOne({
        ticketId: claims.ticketId,
        booking: claims.bookingId,
        qrPayload,
      })
        .session(session)
        .lean();
      if (!ticket) {
        result = { outcome: "INVALID", reason: "Ticket was not found." };
        return;
      }
      const [booking, show] = await Promise.all([
        Booking.findById(ticket.booking).session(session).lean(),
        Booking.findById(ticket.booking).select("show").session(session).lean(),
      ]);
      if (
        !booking ||
        !show ||
        booking.status !== "CONFIRMED" ||
        ticket.bookingStatus !== "CONFIRMED"
      ) {
        result = {
          outcome: "INVALID",
          reason: "Ticket payment is not confirmed.",
        };
        return;
      }
      const showRecord = await Show.findById(show.show).session(session).lean();
      if (!showRecord || (showId && showRecord._id.toString() !== showId)) {
        result = {
          outcome: "INVALID",
          reason: "Ticket does not match this show.",
        };
        return;
      }
      if (
        actor.role === "ORGANIZER" &&
        showRecord.organizer?.toString() !== actor.organizerId
      ) {
        result = {
          outcome: "INVALID",
          reason: "You cannot check in this ticket.",
        };
        return;
      }
      const paid = await Payment.exists({
        booking: booking._id,
        status: "SUCCESS",
      }).session(session);
      if (!paid) {
        result = {
          outcome: "INVALID",
          reason: "Ticket payment is not confirmed.",
        };
        return;
      }
      if (ticket.checkedIn) {
        result = {
          outcome: "ALREADY_USED",
          checkedInAt: ticket.checkedInAt ?? undefined,
        };
        return;
      }
      const checkedIn = await Ticket.findOneAndUpdate(
        { _id: ticket._id, checkedIn: false, checkInStatus: "VALID" },
        {
          $set: {
            checkedIn: true,
            checkedInAt: new Date(),
            checkInStatus: "CHECKED_IN",
          },
        },
        { returnDocument: "after", session },
      ).lean();
      if (!checkedIn) {
        const current = await Ticket.findById(ticket._id)
          .session(session)
          .lean();
        result = {
          outcome: "ALREADY_USED",
          checkedInAt: current?.checkedInAt ?? undefined,
        };
        return;
      }
      result = {
        outcome: "APPROVED",
        ticketId: ticket.ticketId,
        customerName: ticket.customerName,
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

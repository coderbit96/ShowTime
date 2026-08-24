import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { Booking, Ticket } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const user = await requireBookingUser(request);
    const { ticketId } = await params;
    const ticket = await Ticket.findOne({ ticketId }).lean();
    if (!ticket)
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const booking = await Booking.findOne({
      _id: ticket.booking,
      user: user.id,
    }).lean();
    if (!booking)
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    return NextResponse.json({
      ticket: {
        ticketId: ticket.ticketId,
        bookingId: booking._id.toString(),
        customerName: ticket.customerName,
        eventOrMovieName: ticket.eventOrMovieName,
        venue: ticket.venue,
        date: ticket.date.toISOString(),
        time: ticket.time,
        seatNumbers: ticket.seatNumbers,
        ticketCategory: ticket.ticketCategory,
        totalPayment: ticket.totalPayment,
        bookingStatus: ticket.bookingStatus,
        qrPayload: ticket.qrPayload,
        checkedIn: ticket.checkedIn,
        checkedInAt: ticket.checkedInAt?.toISOString(),
      },
    });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Ticket retrieval failed", error);
    return NextResponse.json(
      { error: "Unable to load ticket." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Refund, Show, Ticket, User } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const profile = await User.findById(user.id)
      .select("hiddenBookingIds")
      .lean();
    const hiddenIds = profile?.hiddenBookingIds ?? [];
    const bookings = await Booking.find({
      user: user.id,
      _id: { $nin: hiddenIds },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const [shows, tickets, refunds] = await Promise.all([
      Show.find({ _id: { $in: bookings.map((booking) => booking.show) } })
        .select("startTime venue cinema movie event contentType")
        .populate({ path: "venue", select: "name" })
        .populate({ path: "cinema", select: "name" })
        .populate({ path: "movie", select: "title" })
        .populate({ path: "event", select: "title name" })
        .lean(),
      Ticket.find({ booking: { $in: bookings.map((booking) => booking._id) } })
        .select("booking ticketId eventOrMovieName venue date checkedIn")
        .lean(),
      Refund.find({ booking: { $in: bookings.map((booking) => booking._id) } })
        .select("booking status requestedAmount approvedAmount")
        .lean(),
    ]);
    const showById = new Map(shows.map((show) => [show._id.toString(), show]));
    const ticketByBooking = new Map(
      tickets.map((ticket) => [ticket.booking.toString(), ticket]),
    );
    const refundByBooking = new Map(
      refunds.map((refund) => [refund.booking.toString(), refund]),
    );
    return NextResponse.json({
      bookings: bookings.map((booking) => {
        const show = showById.get(booking.show.toString());
        const ticket = ticketByBooking.get(booking._id.toString());
        const refund = refundByBooking.get(booking._id.toString());
        return {
          id: booking._id.toString(),
          status: booking.status,
          seats: booking.seats.map((seat) => seat.seatId),
          total: booking.pricing.total,
          startTime: show?.startTime?.toISOString(),
          contentType: show?.contentType,
          cinemaId: show?.cinema?._id?.toString(),
          title: ticket?.eventOrMovieName ?? "Your booking",
          venue: ticket?.venue ?? "Venue to be announced",
          ticketId: ticket?.ticketId,
          reviewTarget: show
            ? show.contentType === "MOVIE" && show.movie
              ? { type: "movie", id: show.movie._id.toString() }
              : show.event
                ? { type: "event", id: show.event._id.toString() }
                : show.venue
                  ? { type: "venue", id: show.venue._id.toString() }
                  : null
            : null,
          refund: refund
            ? {
                status: refund.status,
                requestedAmount: refund.requestedAmount,
                approvedAmount: refund.approvedAmount,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Booking history failed", error);
    return NextResponse.json(
      { error: "Unable to load bookings." },
      { status: 500 },
    );
  }
}

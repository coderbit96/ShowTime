import type { ClientSession } from "mongoose";
import {
  Booking,
  Cinema,
  Event,
  Movie,
  Show,
  Ticket,
  User,
  Venue,
} from "@/models";
import { createTicketQrPayload } from "@/lib/tickets/qr-token";

export async function createTicketForConfirmedBooking(
  bookingId: string,
  session: ClientSession,
) {
  const existing = await Ticket.findOne({ booking: bookingId })
    .session(session)
    .lean();
  if (existing) return existing;

  const booking = await Booking.findById(bookingId).session(session).lean();
  if (!booking || booking.status !== "CONFIRMED")
    throw new Error("A confirmed booking is required to create a ticket.");
  const show = await Show.findById(booking.show).session(session).lean();
  const user = await User.findById(booking.user).session(session).lean();
  if (!show || !user) throw new Error("Ticket details are unavailable.");

  const [event, movie, venue, cinema] = await Promise.all([
    show.event
      ? Event.findById(show.event).select("title").session(session).lean()
      : null,
    show.movie
      ? Movie.findById(show.movie).select("title").session(session).lean()
      : null,
    show.venue
      ? Venue.findById(show.venue).select("name").session(session).lean()
      : null,
    show.cinema
      ? Cinema.findById(show.cinema).select("name").session(session).lean()
      : null,
  ]);
  const ticketId = `ST-${booking._id.toString().slice(-12).toUpperCase()}`;
  const eventOrMovieName = event?.title ?? movie?.title ?? "Show Time event";
  const venueName = venue?.name ?? cinema?.name ?? "Venue to be announced";
  const ticket = await Ticket.create(
    [
      {
        booking: booking._id,
        ticketId,
        customerName: user.name,
        eventOrMovieName,
        venue: venueName,
        date: show.date,
        time: show.startTime.toISOString(),
        seatNumbers: booking.seats.map((seat) => seat.seatId),
        ticketCategory: [
          ...new Set(booking.seats.map((seat) => seat.category)),
        ].join(", "),
        totalPayment: booking.pricing.total,
        bookingStatus: "CONFIRMED",
        qrPayload: createTicketQrPayload({
          ticketId,
          bookingId: booking._id.toString(),
        }),
      },
    ],
    { session },
  );
  return ticket[0].toObject();
}

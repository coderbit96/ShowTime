import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Show, Ticket } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    await connectToDatabase();
    const shows = await Show.find({ organizer: actor.organizerId })
      .select("_id startTime event movie venue cinema")
      .lean();
    const bookings = await Booking.find({
      show: { $in: shows.map((show) => show._id) },
    })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const tickets = await Ticket.find({
      booking: { $in: bookings.map((booking) => booking._id) },
    })
      .select(
        "booking ticketId checkedIn checkedInAt eventOrMovieName venue seatNumbers",
      )
      .lean();
    const ticketMap = new Map(
      tickets.map((ticket) => [ticket.booking.toString(), ticket]),
    );
    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        _id: booking._id.toString(),
        show: booking.show.toString(),
        ticket: ticketMap.get(booking._id.toString()) ?? null,
      })),
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

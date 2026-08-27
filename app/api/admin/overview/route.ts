import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import {
  AuditLog,
  Booking,
  Event,
  Organizer,
  Payment,
  Review,
  Ticket,
  User,
} from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    await connectToDatabase();
    const section = request.nextUrl.searchParams.get("section") ?? "overview";
    if (section === "users") {
      const [users, organizers] = await Promise.all([
        User.find({})
          .select(
            "name email phone role active accountStatus blockedAt blockReason createdAt lastLoginAt",
          )
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        Organizer.find({})
          .populate("user", "name email phone active accountStatus createdAt")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
      ]);
      return NextResponse.json({ users, organizers });
    }
    if (section === "events") {
      const events = await Event.find({})
        .populate("organizer", "organizationName")
        .populate("category", "name")
        .populate("venue", "name")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return NextResponse.json({ events });
    }
    if (section === "reviews") {
      const reviews = await Review.find({})
        .populate("user", "name email")
        .populate("event", "title")
        .populate("movie", "title")
        .populate("venue", "name")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return NextResponse.json({ reviews });
    }
    if (section === "audit") {
      const logs = await AuditLog.find({})
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .limit(300)
        .lean();
      return NextResponse.json({ logs });
    }
    if (section === "bookings") {
      const bookings = await Booking.find({})
        .populate("user", "name email phone")
        .populate({
          path: "show",
          select:
            "contentType startTime endTime bookingStatus movie event venue cinema",
          populate: [
            { path: "movie", select: "title" },
            { path: "event", select: "title" },
            { path: "venue", select: "name" },
            { path: "cinema", select: "name" },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      const bookingIds = bookings.map((booking) => booking._id);
      const [payments, tickets] = await Promise.all([
        Payment.find({ booking: { $in: bookingIds } })
          .populate("booking", "status")
          .sort({ createdAt: -1 })
          .limit(300)
          .lean(),
        Ticket.find({ booking: { $in: bookingIds } })
          .select("booking ticketId checkedIn checkedInAt checkInStatus")
          .lean(),
      ]);
      const ticketByBookingId = new Map(
        tickets.map((ticket) => [ticket.booking.toString(), ticket]),
      );
      return NextResponse.json({
        bookings: bookings.map((booking) => ({
          ...booking,
          ticket: ticketByBookingId.get(booking._id.toString()) ?? null,
        })),
        payments,
      });
    }
    const [counts, pendingOrganizers, pendingEvents] = await Promise.all([
      Promise.all([
        User.countDocuments({ role: "CUSTOMER" }),
        Organizer.countDocuments({ active: true }),
        Event.countDocuments({ active: true }),
        Booking.countDocuments({}),
        Payment.countDocuments({ status: "SUCCESS" }),
      ]),
      Organizer.find({ verificationStatus: "PENDING" })
        .populate("user", "name email")
        .sort({ createdAt: 1 })
        .limit(50)
        .lean(),
      Event.find({ approvalStatus: "PENDING", active: true })
        .populate("organizer", "organizationName")
        .sort({ createdAt: 1 })
        .limit(50)
        .lean(),
    ]);
    return NextResponse.json({
      counts: {
        customers: counts[0],
        organizers: counts[1],
        events: counts[2],
        bookings: counts[3],
        successfulPayments: counts[4],
      },
      pendingOrganizers,
      pendingEvents,
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

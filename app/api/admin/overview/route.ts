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
          .select("name email role active createdAt")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        Organizer.find({})
          .populate("user", "name email")
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
      const [bookings, payments] = await Promise.all([
        Booking.find({})
          .populate("user", "name email")
          .populate("show", "startTime bookingStatus")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        Payment.find({})
          .populate("booking", "status")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
      ]);
      return NextResponse.json({ bookings, payments });
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

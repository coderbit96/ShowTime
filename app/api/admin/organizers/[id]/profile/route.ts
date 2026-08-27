import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Event, Organizer, Payout, Show } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    await connectToDatabase();
    const organizer = await Organizer.findById(id)
      .populate("user", "name email phone active accountStatus createdAt")
      .lean();
    if (!organizer)
      return NextResponse.json(
        { error: "Organizer not found." },
        { status: 404 },
      );

    const [events, shows, payouts] = await Promise.all([
      Event.find({ organizer: organizer._id })
        .select("title status approvalStatus startsAt endsAt")
        .sort({ startsAt: -1 })
        .limit(100)
        .lean(),
      Show.find({ organizer: organizer._id }).select("_id").lean(),
      Payout.find({ organizer: organizer._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);
    const sales = await Booking.aggregate([
      {
        $match: {
          show: { $in: shows.map((show) => show._id) },
          status: { $in: ["CONFIRMED", "REFUND_PENDING"] },
        },
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          ticketSales: { $sum: { $size: "$seats" } },
          revenue: { $sum: "$pricing.total" },
          organizerRevenue: { $sum: "$pricing.organizerShare" },
          platformCommission: { $sum: "$pricing.platformCommission" },
        },
      },
    ]);

    return NextResponse.json({
      organizer,
      events,
      payouts,
      sales: sales[0] ?? {
        bookings: 0,
        ticketSales: 0,
        revenue: 0,
        organizerRevenue: 0,
        platformCommission: 0,
      },
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

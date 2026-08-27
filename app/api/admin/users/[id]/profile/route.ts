import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Favorite, Payment, Refund, Review, User } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    await connectToDatabase();
    const user = await User.findOne({ _id: id, role: "CUSTOMER" }).lean();
    if (!user)
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );

    const bookings = await Booking.find({ user: user._id })
      .populate({ path: "show", select: "startTime event movie venue cinema" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const bookingIds = bookings.map((booking) => booking._id);
    const [payments, refunds, favorites, reviews] = await Promise.all([
      Payment.find({ booking: { $in: bookingIds } })
        .select("amount currency status gatewayPaymentId createdAt paidAt")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Refund.find({ booking: { $in: bookingIds } })
        .select(
          "booking requestedAmount approvedAmount status createdAt processedAt",
        )
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Favorite.find({ user: user._id })
        .populate("event", "title")
        .populate("movie", "title")
        .populate("venue", "name")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Review.find({ user: user._id })
        .populate("event", "title")
        .populate("movie", "title")
        .populate("venue", "name")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    return NextResponse.json({
      user,
      bookings,
      payments,
      refunds,
      favorites,
      reviews,
      cancellations: bookings.filter((booking) =>
        ["CANCELLED", "EXPIRED", "REFUNDED"].includes(booking.status),
      ),
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

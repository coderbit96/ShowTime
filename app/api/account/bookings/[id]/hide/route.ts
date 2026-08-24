import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, User } from "@/models";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireBookingUser(request);
    const { id } = await params;
    await connectToDatabase();
    const booking = await Booking.exists({ _id: id, user: user.id });
    if (!booking)
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    await User.updateOne(
      { _id: user.id },
      { $addToSet: { hiddenBookingIds: id } },
    );
    return NextResponse.json({ hidden: true });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to hide booking." },
      { status: 500 },
    );
  }
}

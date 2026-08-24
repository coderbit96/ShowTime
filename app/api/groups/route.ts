import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  createGroupBooking,
  GroupBookingError,
  listGroupBookings,
} from "@/lib/booking/group-booking";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const groups = await listGroupBookings(user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Group booking list failed", error);
    return NextResponse.json(
      { error: "Unable to load group bookings." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const group = await createGroupBooking(user.id, await request.json());
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof GroupBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Group booking creation failed", error);
    return NextResponse.json(
      { error: "Unable to create this group booking." },
      { status: 500 },
    );
  }
}

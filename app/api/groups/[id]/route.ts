import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  getGroupBooking,
  GroupBookingError,
  updateGroupBooking,
} from "@/lib/booking/group-booking";

type GroupRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: GroupRouteContext) {
  try {
    const user = await requireBookingUser(request);
    const { id } = await context.params;
    const group = await getGroupBooking(user.id, id);
    return NextResponse.json({ group });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof GroupBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Group booking lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load this group booking." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: GroupRouteContext) {
  try {
    const user = await requireBookingUser(request);
    const { id } = await context.params;
    const group = await updateGroupBooking(user.id, id, await request.json());
    return NextResponse.json({ group });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof GroupBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Group booking update failed", error);
    return NextResponse.json(
      { error: "Unable to update this group booking." },
      { status: 500 },
    );
  }
}

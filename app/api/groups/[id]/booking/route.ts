import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  attachBookingToGroup,
  GroupBookingError,
} from "@/lib/booking/group-booking";

type GroupBookingRouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: GroupBookingRouteContext,
) {
  try {
    const user = await requireBookingUser(request);
    const { id } = await context.params;
    const group = await attachBookingToGroup(user.id, id, await request.json());
    return NextResponse.json({ group });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof GroupBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Group booking checkout attach failed", error);
    return NextResponse.json(
      { error: "Unable to attach this booking to the group." },
      { status: 500 },
    );
  }
}

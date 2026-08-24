import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  getBookingSummary,
  PendingBookingError,
} from "@/lib/booking/pending-booking";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const { searchParams } = new URL(request.url);
    const summary = await getBookingSummary(
      user.id,
      searchParams.get("showId") ?? "",
      searchParams.get("lockId") ?? "",
    );
    return NextResponse.json({
      summary: { ...summary, expiresAt: summary.expiresAt.toISOString() },
    });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof PendingBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Booking summary request failed", error);
    return NextResponse.json(
      { error: "Unable to load booking summary." },
      { status: 500 },
    );
  }
}

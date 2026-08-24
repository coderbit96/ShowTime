import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  createPendingBooking,
  PendingBookingError,
} from "@/lib/booking/pending-booking";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      showId?: string;
      lockId?: string;
      idempotencyKey?: string;
      couponCode?: string;
      groupBookingId?: string;
    };
    const booking = await createPendingBooking(user.id, {
      showId: body.showId ?? "",
      lockId: body.lockId ?? "",
      idempotencyKey: body.idempotencyKey ?? "",
      couponCode: body.couponCode,
      groupBookingId: body.groupBookingId,
    });
    return NextResponse.json(
      {
        booking: {
          ...booking,
          expiresAt: booking.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof PendingBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Pending booking request failed", error);
    return NextResponse.json(
      { error: "Unable to create a pending booking." },
      { status: 500 },
    );
  }
}

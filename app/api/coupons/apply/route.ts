import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  CouponValidationError,
  validateCouponForBooking,
} from "@/lib/booking/coupon-engine";
import {
  getBookingSummary,
  PendingBookingError,
} from "@/lib/booking/pending-booking";
import { Show } from "@/models";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      showId?: string;
      lockId?: string;
      code?: string;
    };
    const showId = body.showId ?? "";
    const summary = await getBookingSummary(user.id, showId, body.lockId ?? "");
    const show = await Show.findById(showId).select("event category").lean();
    if (!show)
      return NextResponse.json(
        { error: "This show is no longer available." },
        { status: 409 },
      );
    const applied = await validateCouponForBooking({
      code: body.code ?? "",
      userId: user.id,
      eventId: show.event?.toString(),
      categoryId: show.category?.toString(),
      seats: summary.seats,
    });
    return NextResponse.json({
      summary: {
        ...summary,
        coupon: applied.coupon,
        pricing: applied.pricing,
        expiresAt: summary.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof CouponValidationError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof PendingBookingError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Coupon application failed", error);
    return NextResponse.json(
      { error: "Unable to apply this coupon." },
      { status: 500 },
    );
  }
}

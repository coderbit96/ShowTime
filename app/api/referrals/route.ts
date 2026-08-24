import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  getOrCreateReferralCode,
  redeemReferral,
  ReferralError,
} from "@/lib/referrals/referral-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const referral = await getOrCreateReferralCode(user.id);
    return NextResponse.json({ referral });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load referral code." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const referral = await redeemReferral(user.id, await request.json());
    return NextResponse.json({ referral });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof ReferralError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Unable to redeem referral." },
      { status: 500 },
    );
  }
}

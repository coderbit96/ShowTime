import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { WalletPass } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const passes = await WalletPass.find({ user: user.id })
      .sort({ status: 1, expiresAt: 1 })
      .limit(100)
      .lean();
    return NextResponse.json({ passes });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load wallet passes." },
      { status: 500 },
    );
  }
}

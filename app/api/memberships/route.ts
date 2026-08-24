import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  listMembershipPlans,
  MembershipError,
  subscribeWithWallet,
} from "@/lib/memberships/membership-service";
import { WalletError } from "@/lib/wallet/wallet-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    return NextResponse.json(await listMembershipPlans(user.id));
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load memberships." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const subscription = await subscribeWithWallet(
      user.id,
      await request.json(),
    );
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof MembershipError || error instanceof WalletError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Unable to activate membership." },
      { status: 500 },
    );
  }
}

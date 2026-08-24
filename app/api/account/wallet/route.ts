import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  creditWallet,
  debitWallet,
  listWalletActivity,
  WalletError,
} from "@/lib/wallet/wallet-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    return NextResponse.json(await listWalletActivity(user.id));
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load wallet." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      points?: number;
      idempotencyKey?: string;
    };
    const points = Math.max(0, Math.floor(Number(body.points ?? 0)));
    if (points < 100)
      return NextResponse.json(
        { error: "Redeem at least 100 points." },
        { status: 400 },
      );
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await debitWallet({
          userId: user.id,
          points,
          source: "REWARD",
          idempotencyKey: `points-debit:${body.idempotencyKey ?? ""}`,
          session,
          note: "Reward points redeemed",
        });
        await creditWallet({
          userId: user.id,
          amount: Math.floor(points / 10),
          source: "REWARD",
          idempotencyKey: `points-credit:${body.idempotencyKey ?? ""}`,
          session,
          note: "Reward points converted to wallet balance",
        });
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json(await listWalletActivity(user.id));
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof WalletError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Unable to redeem points." },
      { status: 500 },
    );
  }
}

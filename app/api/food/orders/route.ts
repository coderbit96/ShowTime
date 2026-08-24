import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { createFoodOrder, FoodOrderError } from "@/lib/food/food-service";
import { WalletError } from "@/lib/wallet/wallet-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const order = await createFoodOrder(user.id, await request.json());
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof FoodOrderError || error instanceof WalletError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Unable to place food order." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { FoodOrderError, listCinemaFood } from "@/lib/food/food-service";

export async function GET(request: NextRequest) {
  try {
    const cinemaId = request.nextUrl.searchParams.get("cinemaId") ?? "";
    const items = await listCinemaFood(cinemaId);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof FoodOrderError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Unable to load food menu." },
      { status: 500 },
    );
  }
}

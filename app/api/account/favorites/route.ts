import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Favorite } from "@/models";

const favoriteSchema = z.object({
  type: z.enum(["event", "movie", "venue"]),
  id: z.string().regex(/^[a-f\d]{24}$/i),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const favorites = await Favorite.find({ user: user.id })
      .populate({ path: "event", select: "title slug poster" })
      .populate({ path: "movie", select: "title slug poster" })
      .populate({ path: "venue", select: "name slug images" })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ favorites });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load favorites." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const parsed = favoriteSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid favorite." }, { status: 400 });
    await connectToDatabase();
    await Favorite.updateOne(
      { user: user.id, [parsed.data.type]: parsed.data.id },
      { $setOnInsert: { user: user.id, [parsed.data.type]: parsed.data.id } },
      { upsert: true },
    );
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to save favorite." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const parsed = favoriteSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid favorite." }, { status: 400 });
    await connectToDatabase();
    await Favorite.deleteOne({
      user: user.id,
      [parsed.data.type]: parsed.data.id,
    });
    return NextResponse.json({ removed: true });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to remove favorite." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Review, Show } from "@/models";

const reviewSchema = z.object({
  type: z.enum(["event", "movie", "venue"]),
  id: z.string().regex(/^[a-f\d]{24}$/i),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    await connectToDatabase();
    const attendedBookings = await Booking.find({
      user: user.id,
      status: { $in: ["CONFIRMED", "REFUNDED"] },
    })
      .select("show")
      .lean();
    const attendedShow = await Show.findOne({
      _id: { $in: attendedBookings.map((booking) => booking.show) },
      startTime: { $lte: new Date() },
      [parsed.data.type]: parsed.data.id,
    }).lean();
    if (!attendedShow)
      return NextResponse.json(
        { error: "You can review an event only after attending it." },
        { status: 403 },
      );
    const review = await Review.findOneAndUpdate(
      { user: user.id, [parsed.data.type]: parsed.data.id },
      {
        $set: {
          rating: parsed.data.rating,
          comment: parsed.data.comment,
          status: "PENDING",
        },
        $setOnInsert: { user: user.id, [parsed.data.type]: parsed.data.id },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to save review." },
      { status: 500 },
    );
  }
}

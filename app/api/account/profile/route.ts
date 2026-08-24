import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  avatar: z.string().url().max(1000).optional().or(z.literal("")),
  cityId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional()
    .or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const profile = await User.findById(user.id)
      .populate({ path: "city", select: "name slug" })
      .select("name email phone avatar city")
      .lean();
    return NextResponse.json({ profile });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid profile details." },
        { status: 400 },
      );
    await connectToDatabase();
    const profile = await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          name: parsed.data.name,
          phone: parsed.data.phone || undefined,
          avatar: parsed.data.avatar || undefined,
          city: parsed.data.cityId || undefined,
        },
      },
      { returnDocument: "after" },
    )
      .select("name email phone avatar city")
      .lean();
    return NextResponse.json({ profile });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 },
    );
  }
}

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
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  gender: z
    .enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"])
    .optional()
    .or(z.literal("")),
  address: z.object({
    line1: z.string().trim().max(160).optional().or(z.literal("")),
    line2: z.string().trim().max(160).optional().or(z.literal("")),
    locality: z.string().trim().max(100).optional().or(z.literal("")),
    state: z.string().trim().max(100).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    country: z.string().trim().max(100).optional().or(z.literal("")),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const profile = await User.findById(user.id)
      .select("name email phone dateOfBirth gender address")
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
    const address = parsed.data.address;
    const hasAddress = Object.values(address).some(Boolean);
    const update = {
      $set: { name: parsed.data.name } as Record<string, unknown>,
      $unset: {} as Record<string, 1>,
    };

    if (parsed.data.phone) update.$set.phone = parsed.data.phone;
    else update.$unset.phone = 1;
    if (parsed.data.dateOfBirth)
      update.$set.dateOfBirth = new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`);
    else update.$unset.dateOfBirth = 1;
    if (parsed.data.gender) update.$set.gender = parsed.data.gender;
    else update.$unset.gender = 1;
    if (hasAddress) update.$set.address = address;
    else update.$unset.address = 1;

    const profile = await User.findByIdAndUpdate(
      user.id,
      update,
      { returnDocument: "after" },
    )
      .select("name email phone dateOfBirth gender address")
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

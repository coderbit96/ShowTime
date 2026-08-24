import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { cinemaSchema, slugify } from "@/lib/management/schemas";
import { Cinema } from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request);
    const cinemas = await Cinema.find({ active: true })
      .populate("city", "name state")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ cinemas });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const input = cinemaSchema.parse(await request.json());
    const cinema = await Cinema.create({
      ...input,
      slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
      location: { type: "Point", coordinates: input.coordinates ?? [0, 0] },
    });
    return NextResponse.json({ cinema }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

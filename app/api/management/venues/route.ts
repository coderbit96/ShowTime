import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { slugify, venueSchema } from "@/lib/management/schemas";
import { Venue } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const filter =
      actor.role === "ADMIN"
        ? {}
        : {
            $or: [
              { approvalStatus: "APPROVED" },
              { createdBy: actor.organizerId },
            ],
          };
    const venues = await Venue.find(filter as never)
      .populate("city", "name state")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ venues });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    if (actor.role === "ORGANIZER" && !actor.canCreateVenues)
      throw new Error(
        "Your account cannot create venues. Select an approved venue instead.",
      );
    const input = venueSchema.parse(await request.json());
    const venue = await Venue.create({
      ...input,
      slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
      location: { type: "Point", coordinates: input.coordinates ?? [0, 0] },
      approvalStatus: actor.role === "ADMIN" ? "APPROVED" : "PENDING",
      createdBy: actor.organizerId,
    });
    return NextResponse.json({ venue }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

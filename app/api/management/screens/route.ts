import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { makeSeatRows, screenSchema, slugify } from "@/lib/management/schemas";
import { Cinema, Screen, SeatLayout, Venue } from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request);
    const screens = await Screen.find({ active: true })
      .populate("cinema", "name")
      .populate("venue", "name")
      .populate("seatLayout", "name totalSeats categories rows")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ screens });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const input = screenSchema.parse(await request.json());
    if (
      input.cinema &&
      !(await Cinema.exists({ _id: input.cinema, active: true }))
    )
      throw new Error("Cinema not found.");
    if (
      input.venue &&
      !(await Venue.exists({ _id: input.venue, active: true }))
    )
      throw new Error("Venue not found.");
    const capacity = input.rows.reduce(
      (total, row) => total + row.seatCount,
      0,
    );
    const categories = [...new Set(input.rows.map((row) => row.category))];
    const session = await mongoose.startSession();
    let screenId = "";
    try {
      await session.withTransaction(async () => {
        const [seatLayout] = await SeatLayout.create(
          [
            {
              name: `${slugify(input.name)}-${Date.now().toString(36)}`,
              rows: makeSeatRows(input.rows),
              categories,
              totalSeats: capacity,
            },
          ],
          { session },
        );
        const [screen] = await Screen.create(
          [
            {
              name: input.name,
              cinema: input.cinema,
              venue: input.venue,
              seatLayout: seatLayout._id,
              capacity,
              rowConfiguration: input.rows,
              seatCategories: categories,
            },
          ],
          { session },
        );
        screenId = screen._id.toString();
      });
    } finally {
      await session.endSession();
    }
    const screen = await Screen.findById(screenId)
      .populate("seatLayout")
      .lean();
    return NextResponse.json({ screen }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

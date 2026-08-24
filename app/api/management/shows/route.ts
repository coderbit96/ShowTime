import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import {
  createScheduledShow,
  ShowScheduleConflictError,
} from "@/lib/booking/schedule-show";
import { Show } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const filter =
      actor.role === "ADMIN" ? {} : { organizer: actor.organizerId };
    const shows = await Show.find(filter as never)
      .populate("movie", "title")
      .populate("event", "title")
      .populate("cinema", "name")
      .populate("venue", "name")
      .populate("screen", "name")
      .sort({ startTime: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ shows });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const show = await createScheduledShow(actor, await request.json());
    return NextResponse.json({ show }, { status: 201 });
  } catch (error) {
    if (error instanceof ShowScheduleConflictError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return managementErrorResponse(error);
  }
}

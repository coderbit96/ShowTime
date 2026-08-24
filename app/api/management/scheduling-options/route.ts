import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { Event, Movie, Screen } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const eventFilter =
      actor.role === "ADMIN"
        ? { active: true, status: "PUBLISHED" }
        : { active: true, status: "PUBLISHED", organizer: actor.organizerId };
    const [events, movies, screens] = await Promise.all([
      Event.find(eventFilter as never)
        .select("title venue organizer startsAt")
        .populate("venue", "name")
        .sort({ startsAt: 1 })
        .lean(),
      actor.role === "ADMIN"
        ? Movie.find({ active: true }).select("title").sort({ title: 1 }).lean()
        : [],
      Screen.find({ active: true })
        .select("name cinema venue capacity seatCategories")
        .populate("cinema", "name")
        .populate("venue", "name approvalStatus")
        .sort({ name: 1 })
        .lean(),
    ]);

    const eventOptions = events as unknown as Array<{
      _id: { toString(): string };
      title: string;
      venue?: { _id: { toString(): string }; name: string } | null;
    }>;
    const screenOptions = screens as unknown as Array<{
      _id: { toString(): string };
      name: string;
      capacity: number;
      seatCategories: string[];
      cinema?: { _id: { toString(): string }; name: string } | null;
      venue?: { _id: { toString(): string }; name: string } | null;
    }>;

    return NextResponse.json({
      events: eventOptions.map((event) => ({
        id: event._id.toString(),
        title: event.title,
        venueId: event.venue?._id?.toString(),
        venueName: event.venue?.name,
      })),
      movies: movies.map((movie) => ({
        id: movie._id.toString(),
        title: movie.title,
      })),
      screens: screenOptions.map((screen) => ({
        id: screen._id.toString(),
        name: screen.name,
        cinemaId: screen.cinema?._id?.toString(),
        cinemaName: screen.cinema?.name,
        venueId: screen.venue?._id?.toString(),
        venueName: screen.venue?.name,
        categories: screen.seatCategories,
        capacity: screen.capacity,
      })),
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

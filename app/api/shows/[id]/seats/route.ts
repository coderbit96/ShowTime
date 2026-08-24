import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/get-optional-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, Screen, SeatLayout, SeatLock, Show } from "@/models";

type SeatStatus = "AVAILABLE" | "LOCKED" | "BOOKED" | "BLOCKED";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id))
    return NextResponse.json({ error: "Show not found." }, { status: 404 });
  await connectToDatabase();
  const [viewer, show] = await Promise.all([
    getOptionalUser(request),
    Show.findOne({
      _id: id,
      active: true,
      bookingStatus: { $in: ["SCHEDULED", "SOLD_OUT"] },
    })
      .select("screen pricing bookingLimits bookingStatus seatAvailability")
      .lean(),
  ]);
  if (!show)
    return NextResponse.json({ error: "Show not found." }, { status: 404 });

  const screen = await Screen.findOne({ _id: show.screen, active: true })
    .select("seatLayout")
    .lean();
  if (!screen)
    return NextResponse.json({ error: "Screen not found." }, { status: 404 });

  const now = new Date();
  const [layout, bookings, locks] = await Promise.all([
    SeatLayout.findOne({ _id: screen.seatLayout, active: true })
      .select("rows categories totalSeats")
      .lean(),
    Booking.find({
      show: show._id,
      $or: [
        { status: { $in: ["CONFIRMED", "REFUND_PENDING"] } },
        { status: "PENDING", expiresAt: { $gt: now } },
      ],
    })
      .select("seats.seatId")
      .lean(),
    SeatLock.find({
      show: show._id,
      status: "ACTIVE",
      expiresAt: { $gt: now },
    })
      .select("user seatIds expiresAt")
      .lean(),
  ]);
  if (!layout)
    return NextResponse.json(
      { error: "Seat layout not found." },
      { status: 404 },
    );

  const snapshotStatus = new Map(
    show.seatAvailability.map((seat) => [seat.seatId, seat.status]),
  );
  const bookedSeatIds = new Set(
    bookings.flatMap((booking) => booking.seats.map((seat) => seat.seatId)),
  );
  const lockedSeatIds = new Set(
    locks
      .filter((lock) => lock.user.toString() !== viewer?.id)
      .flatMap((lock) => lock.seatIds),
  );
  const viewerLock = viewer
    ? locks
        .filter((lock) => lock.user.toString() === viewer.id)
        .sort(
          (first, second) =>
            second.expiresAt.getTime() - first.expiresAt.getTime(),
        )[0]
    : null;
  const resolveStatus = (seatId: string): SeatStatus => {
    const snapshot = snapshotStatus.get(seatId);
    if (snapshot === "BLOCKED") return "BLOCKED";
    if (snapshot === "BOOKED" || bookedSeatIds.has(seatId)) return "BOOKED";
    if (snapshot === "LOCKED" || lockedSeatIds.has(seatId)) return "LOCKED";
    return "AVAILABLE";
  };

  return NextResponse.json({
    show: {
      id: show._id.toString(),
      pricing: show.pricing,
      bookingLimits: show.bookingLimits,
      bookingStatus: show.bookingStatus,
    },
    layout: {
      categories: layout.categories,
      totalSeats: layout.totalSeats,
      rows: layout.rows.map((row) => ({
        label: row.label,
        seats: row.seats.map((seat) => ({
          id: seat.seatId,
          row: seat.row,
          number: seat.number,
          category: seat.category,
          status: resolveStatus(seat.seatId),
        })),
      })),
    },
    lock: viewerLock
      ? {
          id: viewerLock._id.toString(),
          seatIds: viewerLock.seatIds,
          expiresAt: viewerLock.expiresAt.toISOString(),
        }
      : null,
    updatedAt: new Date().toISOString(),
  });
}

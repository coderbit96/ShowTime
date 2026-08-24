import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import {
  createSeatLock,
  releaseSeatLock,
  SeatLockInputError,
  SeatUnavailableError,
} from "@/lib/booking/seat-locks";

function lockErrorResponse(error: unknown) {
  const authResponse = bookingAuthErrorResponse(error);
  if (authResponse) return authResponse;
  if (error instanceof SeatUnavailableError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof SeatLockInputError)
    return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("Seat lock request failed", error);
  return NextResponse.json(
    { error: "Unable to lock seats. Please try again." },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireBookingUser(request);
    const body = (await request.json()) as {
      seatIds?: string[];
      idempotencyKey?: string;
    };
    const lock = await createSeatLock(user.id, {
      showId: id,
      seatIds: body.seatIds ?? [],
      idempotencyKey: body.idempotencyKey ?? "",
    });
    return NextResponse.json(
      { lock: { ...lock, expiresAt: lock.expiresAt.toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    return lockErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireBookingUser(request);
    const body = (await request.json()) as { lockId?: string };
    const released = await releaseSeatLock(user.id, id, body.lockId ?? "");
    return NextResponse.json({ released: released.id });
  } catch (error) {
    return lockErrorResponse(error);
  }
}

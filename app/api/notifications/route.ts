import { NextRequest, NextResponse } from "next/server";
import {
  bookingAuthErrorResponse,
  requireBookingUser,
} from "@/lib/auth/require-booking-user";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Notification } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    await connectToDatabase();
    const notifications = await Notification.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return NextResponse.json({
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        title: notification.title,
        body: notification.body,
        type: notification.type,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
        metadata: notification.metadata,
      })),
    });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBookingUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      ids?: string[];
      all?: boolean;
    };
    await connectToDatabase();
    const filter = body.all
      ? { user: user.id, readAt: { $exists: false } }
      : {
          user: user.id,
          _id: {
            $in: (body.ids ?? []).filter((id) => /^[a-f\d]{24}$/i.test(id)),
          },
          readAt: { $exists: false },
        };
    await Notification.updateMany(filter, { $set: { readAt: new Date() } });
    return NextResponse.json({ updated: true });
  } catch (error) {
    const authResponse = bookingAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }
}

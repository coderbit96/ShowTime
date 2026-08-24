import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models";

export class BookingAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type BookingUser = { id: string; firebaseUid: string };

export async function requireBookingUser(
  request: NextRequest,
): Promise<BookingUser> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token) throw new BookingAuthError("Sign in to lock seats.", 401);

  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
  await connectToDatabase();
  const user = await User.findOne({
    firebaseUid: decodedToken.uid,
    active: true,
    role: "CUSTOMER",
  })
    .select("_id firebaseUid")
    .lean();
  if (!user)
    throw new BookingAuthError(
      "A customer account is required to lock seats.",
      403,
    );

  return { id: user._id.toString(), firebaseUid: user.firebaseUid };
}

export function bookingAuthErrorResponse(error: unknown) {
  if (error instanceof BookingAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}

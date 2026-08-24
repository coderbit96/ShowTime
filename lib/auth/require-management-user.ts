import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Organizer, User } from "@/models";

export type ManagementRole = "ADMIN" | "ORGANIZER";

export type ManagementUser = {
  id: string;
  firebaseUid: string;
  role: ManagementRole;
  organizerId?: string;
  canCreateVenues: boolean;
};

export class ManagementAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function requireManagementUser(
  request: NextRequest,
  allowedRoles: ManagementRole[] = ["ADMIN", "ORGANIZER"],
): Promise<ManagementUser> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token) throw new ManagementAuthError("Authentication is required.", 401);

  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
  await connectToDatabase();
  const user = await User.findOne({
    firebaseUid: decodedToken.uid,
    active: true,
  })
    .select("_id firebaseUid role")
    .lean();

  if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
    throw new ManagementAuthError(
      "You do not have access to management tools.",
      403,
    );
  }
  if (!allowedRoles.includes(user.role)) {
    throw new ManagementAuthError(
      "You do not have permission for this action.",
      403,
    );
  }

  if (user.role === "ADMIN") {
    return {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      role: "ADMIN",
      canCreateVenues: true,
    };
  }

  const organizer = await Organizer.findOne({ user: user._id, active: true })
    .select("_id verificationStatus canCreateVenues")
    .lean();
  if (!organizer || organizer.verificationStatus !== "VERIFIED") {
    throw new ManagementAuthError(
      "Your organizer account is not approved.",
      403,
    );
  }

  return {
    id: user._id.toString(),
    firebaseUid: user.firebaseUid,
    role: "ORGANIZER",
    organizerId: organizer._id.toString(),
    canCreateVenues: organizer.canCreateVenues,
  };
}

export function managementErrorResponse(error: unknown) {
  if (error instanceof ManagementAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json(
    { error: "Unable to complete this request." },
    { status: 500 },
  );
}

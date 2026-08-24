import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models";

export async function getOptionalUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    await connectToDatabase();
    const user = await User.findOne({ firebaseUid: decoded.uid, active: true })
      .select("_id")
      .lean();
    return user ? { id: user._id.toString() } : null;
  } catch {
    return null;
  }
}

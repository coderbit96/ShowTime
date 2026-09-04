import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token)
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    await connectToDatabase();
    const user = await User.findOne({
      firebaseUid: decoded.uid,
      active: true,
    })
      .select("name email role accountStatus")
      .lean();

    if (!user)
      return NextResponse.json(
        { error: "Your Show Time profile is not available." },
        { status: 404 },
      );

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Your session could not be verified. Please sign in again." },
      { status: 401 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceConfigurationError() {
  const missing = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "MONGODB_URI",
  ].filter((name) => !process.env[name]);

  return missing.length
    ? `Account service is unavailable. Missing deployment configuration: ${missing.join(", ")}.`
    : null;
}

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

  const configurationError = serviceConfigurationError();
  if (configurationError) {
    console.error(configurationError);
    return NextResponse.json(
      {
        error:
          "Account service is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  try {
    const [{ getFirebaseAdminAuth }, { connectToDatabase }, { User }] =
      await Promise.all([
        import("@/lib/firebase/admin"),
        import("@/lib/mongodb/connect"),
        import("@/models"),
      ]);
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
  } catch (error) {
    console.error("Account session verification failed", error);
    return NextResponse.json(
      {
        error:
          "Your session could not be verified. Please sign in again or try later.",
      },
      { status: 401 },
    );
  }
}

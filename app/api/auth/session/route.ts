import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { User } from "@/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceConfigurationError() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const missing = [
    !projectId && "FIREBASE_ADMIN_PROJECT_ID",
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL && "FIREBASE_ADMIN_CLIENT_EMAIL",
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY && "FIREBASE_ADMIN_PRIVATE_KEY",
    !process.env.MONGODB_URI && "MONGODB_URI",
  ].filter(Boolean);

  return missing.length
    ? `Account service is unavailable. Missing deployment configuration: ${missing.join(", ")}.`
    : null;
}

function isInvalidSessionError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  return typeof code === "string" && code.startsWith("auth/");
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
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    if (!decoded.email)
      return NextResponse.json(
        { error: "Your Firebase account does not have an email address." },
        { status: 400 },
      );

    await connectToDatabase();
    let user = await User.findOne({
      firebaseUid: decoded.uid,
      active: true,
    })
      .select("name email role accountStatus")
      .lean();

    if (!user) {
      const existingUser = await User.exists({ firebaseUid: decoded.uid });
      if (existingUser)
        return NextResponse.json(
          { error: "Your Show Time profile is not currently active." },
          { status: 403 },
        );

      user = await User.findOneAndUpdate(
        { firebaseUid: decoded.uid },
        {
          $setOnInsert: {
            firebaseUid: decoded.uid,
            email: decoded.email,
            name: decoded.name ?? decoded.email.split("@")[0],
            role: "CUSTOMER",
            active: true,
            accountStatus: "ACTIVE",
          },
          $set: { lastLoginAt: new Date() },
        },
        { upsert: true, returnDocument: "after" },
      )
        .select("name email role accountStatus")
        .lean();
    } else {
      await User.updateOne(
        { firebaseUid: decoded.uid },
        { $set: { lastLoginAt: new Date() } },
      );
    }

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
    const status = isInvalidSessionError(error) ? 401 : 503;
    console.error("Account session verification failed", error);
    return NextResponse.json(
      {
        error:
          status === 401
            ? "Your session has expired. Please sign in again."
            : "Account service is temporarily unavailable. Please try again later.",
      },
      { status },
    );
  }
}

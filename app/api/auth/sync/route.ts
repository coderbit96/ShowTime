import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { slugify } from "@/lib/management/schemas";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Organizer, User } from "@/models";

const syncSchema = z.object({
  role: z.enum(["CUSTOMER", "ORGANIZER"]).default("CUSTOMER"),
  expectedRole: z.enum(["CUSTOMER", "ORGANIZER", "ADMIN"]).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  organizationName: z.string().trim().min(2).max(160).optional(),
});

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token)
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  const parsed = syncSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid auth profile." },
      { status: 400 },
    );

  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
  if (!decoded.email)
    return NextResponse.json(
      { error: "Firebase account must have an email address." },
      { status: 400 },
    );
  await connectToDatabase();
  const role = parsed.data.role;
  const expectedRole = parsed.data.expectedRole;

  if (expectedRole === "ADMIN") {
    const adminUser = await User.findOneAndUpdate(
      {
        $or: [{ firebaseUid: decoded.uid }, { email: decoded.email }],
        role: "ADMIN",
        active: true,
      },
      {
        $set: {
          firebaseUid: decoded.uid,
          email: decoded.email,
          name: parsed.data.name ?? decoded.name ?? decoded.email.split("@")[0],
          avatar: decoded.picture,
          lastLoginAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();

    if (!adminUser) {
      return NextResponse.json(
        { error: "This login is only for Admin accounts." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      user: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  }

  const user = await User.findOneAndUpdate(
    { firebaseUid: decoded.uid },
    {
      $setOnInsert: {
        firebaseUid: decoded.uid,
        email: decoded.email,
        role,
        active: true,
        accountStatus: "ACTIVE",
      },
      $set: {
        name: parsed.data.name ?? decoded.name ?? decoded.email.split("@")[0],
        phone: parsed.data.phone,
        avatar: decoded.picture,
        lastLoginAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();

  if (expectedRole && user.role !== expectedRole) {
    return NextResponse.json(
      {
        error: `This login is only for ${expectedRole.toLowerCase()} accounts.`,
      },
      { status: 403 },
    );
  }

  let organizerStatus: string | undefined;

  if (role === "ORGANIZER") {
    const organizationName =
      parsed.data.organizationName ?? `${user.name}'s Organization`;
    const organizer = await Organizer.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          organizationName,
          slug: `${slugify(organizationName)}-${Date.now().toString(36)}`,
          contactEmail: user.email,
          verificationStatus: "PENDING",
        },
        $set: {
          contactPhone: parsed.data.phone,
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();

    organizerStatus = organizer?.verificationStatus;

    if (
      expectedRole === "ORGANIZER" &&
      organizer?.verificationStatus !== "VERIFIED"
    ) {
      return NextResponse.json(
        {
          error:
            "Your organizer account is not approved yet. Please wait some time.",
        },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizerStatus,
    },
  });
}

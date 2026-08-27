import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { Organizer } from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const organizers = await Organizer.find({
      active: true,
      verificationStatus: "VERIFIED",
    })
      .select("organizationName")
      .sort({ organizationName: 1 })
      .lean();
    return NextResponse.json({ organizers });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

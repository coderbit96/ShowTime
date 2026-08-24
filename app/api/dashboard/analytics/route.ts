import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { getDashboardAnalytics } from "@/lib/analytics/dashboard-analytics";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    return NextResponse.json(
      await getDashboardAnalytics({
        role: actor.role,
        organizerId: actor.organizerId,
      }),
    );
  } catch (error) {
    return managementErrorResponse(error);
  }
}

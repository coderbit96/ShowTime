import { NextRequest, NextResponse } from "next/server";
import {
  requireManagementUser,
  managementErrorResponse,
} from "@/lib/auth/require-management-user";
import { City } from "@/models";

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request);
    const cities = await City.find({ active: true })
      .select("name state slug")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({
      cities: cities.map((city) => ({
        id: city._id.toString(),
        name: city.name,
        state: city.state,
        slug: city.slug,
      })),
    });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

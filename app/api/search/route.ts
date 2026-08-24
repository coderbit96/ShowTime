import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams, searchCatalog } from "@/lib/search";

export async function GET(request: NextRequest) {
  const filters = parseSearchParams(request.nextUrl.searchParams);
  const response = await searchCatalog(filters);

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

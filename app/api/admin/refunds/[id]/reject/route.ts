import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { RefundFlowError, rejectRefund } from "@/lib/refunds/refund-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    return NextResponse.json({
      refund: await rejectRefund(admin.id, id, body.note),
    });
  } catch (error) {
    if (error instanceof RefundFlowError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return managementErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import {
  RefundFlowError,
  retryFailedRefund,
} from "@/lib/refunds/refund-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      approvedAmount?: number;
      note?: string;
    };
    return NextResponse.json(
      await retryFailedRefund(admin.id, id, body.approvedAmount, body.note),
    );
  } catch (error) {
    if (error instanceof RefundFlowError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return managementErrorResponse(error);
  }
}

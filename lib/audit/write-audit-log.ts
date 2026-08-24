import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { AuditLog } from "@/models";

export async function writeAuditLog({
  request,
  actorId,
  actorRole,
  action,
  resourceType,
  resourceId,
  before,
  after,
}: {
  request?: NextRequest;
  actorId?: string;
  actorRole: "CUSTOMER" | "ORGANIZER" | "ADMIN" | "SYSTEM";
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await connectToDatabase();
  await AuditLog.create({
    actor: actorId,
    actorRole,
    action,
    resourceType,
    resourceId,
    before,
    after,
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request?.headers.get("user-agent") ?? undefined,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { slugify } from "@/lib/management/schemas";
import { City } from "@/models";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  image: z.string().trim().url().optional().or(z.literal("")),
  aliases: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const before = await City.findById(id).lean();
    if (!before)
      return NextResponse.json(
        { error: "City was not found." },
        { status: 404 },
      );
    const city = await City.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          ...(input.name ? { slug: slugify(input.name) } : {}),
          ...(input.image === "" ? { image: undefined } : {}),
          ...(input.aliases
            ? { aliases: input.aliases.map((alias) => alias.toLowerCase()) }
            : {}),
        },
      },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CITY_UPDATED",
      resourceType: "City",
      resourceId: id,
      before,
      after: city,
    });
    return NextResponse.json({ city });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { slugify } from "@/lib/management/schemas";
import { Category } from "@/models";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(500).optional(),
  image: z.string().trim().url().optional().or(z.literal("")),
  parent: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
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
    const before = await Category.findById(id).lean();
    if (!before)
      return NextResponse.json(
        { error: "Category was not found." },
        { status: 404 },
      );
    if (input.parent === id)
      return NextResponse.json(
        { error: "A category cannot be its own parent." },
        { status: 400 },
      );
    const category = await Category.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          ...(input.name ? { slug: slugify(input.name) } : {}),
          ...(input.image === "" ? { image: undefined } : {}),
          ...(input.parent === null ? { parent: undefined } : {}),
        },
      },
      { returnDocument: "after" },
    ).lean();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CATEGORY_UPDATED",
      resourceType: "Category",
      resourceId: id,
      before,
      after: category,
    });
    return NextResponse.json({ category });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { slugify } from "@/lib/management/schemas";
import { Category } from "@/models";

const objectId = /^[a-f\d]{24}$/i;

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const categories = await Category.find(
      actor.role === "ADMIN" ? {} : { active: true },
    )
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return NextResponse.json({ categories });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      icon?: string;
      image?: string;
      parent?: string;
      sortOrder?: number;
      active?: boolean;
    };
    if (!body.name?.trim())
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 },
      );
    const category = await Category.create({
      name: body.name.trim(),
      slug: slugify(body.name),
      description: body.description?.trim(),
      icon: body.icon?.trim(),
      image: body.image?.trim(),
      ...(body.parent && objectId.test(body.parent)
        ? { parent: body.parent }
        : {}),
      sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      active: body.active ?? true,
    });
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CATEGORY_CREATED",
      resourceType: "Category",
      resourceId: category._id.toString(),
      after: category.toObject(),
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

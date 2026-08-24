import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { FoodItem } from "@/models";

const foodItemSchema = z.object({
  cinema: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  image: z.string().url().optional(),
  category: z
    .enum(["SNACK", "BEVERAGE", "COMBO", "MEAL", "DESSERT"])
    .default("SNACK"),
  price: z.number().min(0),
  available: z.boolean().default(true),
  preparationMinutes: z.number().int().min(0).default(10),
});

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const cinema = request.nextUrl.searchParams.get("cinema");
    const items = await FoodItem.find(cinema ? { cinema } : {})
      .sort({ cinema: 1, category: 1, name: 1 })
      .limit(300)
      .lean();
    return NextResponse.json({ items });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = foodItemSchema.parse(await request.json());
    const item = await FoodItem.create(input);
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "FOOD_ITEM_CREATED",
      resourceType: "FoodItem",
      resourceId: item._id.toString(),
      after: item.toObject(),
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

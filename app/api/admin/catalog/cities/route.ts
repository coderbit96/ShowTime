import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { slugify } from "@/lib/management/schemas";
import { City } from "@/models";

const citySchema = z.object({
  name: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100).default("India"),
  image: z.string().trim().url().optional().or(z.literal("")),
  aliases: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireManagementUser(request, ["ADMIN"]);
    const cities = await City.find({}).sort({ featured: -1, name: 1 }).lean();
    return NextResponse.json({ cities });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const input = citySchema.parse(await request.json());
    const city = await City.create({
      ...input,
      image: input.image || undefined,
      aliases: input.aliases.map((alias) => alias.toLowerCase()),
      slug: slugify(input.name),
    });
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "CITY_CREATED",
      resourceType: "City",
      resourceId: city._id.toString(),
      after: city.toObject(),
    });
    return NextResponse.json({ city }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

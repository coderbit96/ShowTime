import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { slugify } from "@/lib/management/schemas";
import { Event } from "@/models";

const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(20).max(8000),
    poster: z.string().url(),
    banner: z.string().url().optional(),
    gallery: z.array(z.string().url()).max(12).default([]),
    category: z.string().regex(/^[a-f\d]{24}$/i),
    city: z.string().regex(/^[a-f\d]{24}$/i),
    venue: z.string().regex(/^[a-f\d]{24}$/i),
    eventType: z.enum([
      "CONCERT",
      "COMEDY",
      "THEATRE",
      "SPORT",
      "WORKSHOP",
      "FESTIVAL",
      "GAMING",
      "EXHIBITION",
      "KIDS",
      "LOCAL",
      "COLLEGE",
      "ADVENTURE",
      "SPECIAL_EXPERIENCE",
    ]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    language: z.array(z.string().trim()).default([]),
    ageRestriction: z.string().trim().max(100).default("All ages"),
    ticketLimit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "End time must be after start time.",
    path: ["endsAt"],
  });

export async function GET(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    const status = request.nextUrl.searchParams.get("status") as
      "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | null;
    const filter = {
      organizer: actor.organizerId,
      ...(status ? { status } : {}),
    };
    const events = await Event.find(filter as never)
      .populate("category", "name")
      .populate("venue", "name")
      .sort({ startsAt: -1 })
      .lean();
    return NextResponse.json({ events });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request, ["ORGANIZER"]);
    const input = eventSchema.parse(await request.json());
    const event = await Event.create({
      ...input,
      organizer: actor.organizerId,
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      status: "DRAFT",
      approvalStatus: "PENDING",
    });
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ORGANIZER",
      action: "EVENT_CREATED",
      resourceType: "Event",
      resourceId: event._id.toString(),
      after: { title: event.title, status: event.status },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

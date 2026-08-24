import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { makeSeatRows, updateScreenSchema } from "@/lib/management/schemas";
import { Screen, SeatLayout } from "@/models";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await context.params;
    const input = updateScreenSchema.parse(await request.json());
    const screen = await Screen.findById(id);
    if (!screen) throw new Error("Screen not found.");
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (input.rows) {
          const capacity = input.rows.reduce(
            (total, row) => total + row.seatCount,
            0,
          );
          const categories = [
            ...new Set(input.rows.map((row) => row.category)),
          ];
          await SeatLayout.findByIdAndUpdate(
            screen.seatLayout,
            {
              rows: makeSeatRows(input.rows),
              categories,
              totalSeats: capacity,
            },
            { session },
          );
          screen.rowConfiguration = input.rows as never;
          screen.seatCategories = categories as never;
          screen.capacity = capacity;
        }
        if (input.name) screen.name = input.name;
        if (input.cinema) screen.cinema = input.cinema as never;
        if (input.venue) screen.venue = input.venue as never;
        if (typeof input.active === "boolean") screen.active = input.active;
        await screen.save({ session });
      });
    } finally {
      await session.endSession();
    }
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "SCREEN_UPDATED",
      resourceType: "Screen",
      resourceId: screen._id.toString(),
      after: screen.toObject(),
    });
    return NextResponse.json({ screen });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await context.params;
    const screen = await Screen.findById(id);
    if (!screen) throw new Error("Screen not found.");
    screen.active = false;
    await screen.save();
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: "SCREEN_ARCHIVED",
      resourceType: "Screen",
      resourceId: screen._id.toString(),
      before: { active: true },
      after: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

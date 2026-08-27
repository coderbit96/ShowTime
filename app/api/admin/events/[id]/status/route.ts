import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  Booking,
  Event,
  Notification,
  Organizer,
  Payment,
  Refund,
  Show,
} from "@/models";

const schema = z.object({
  action: z.enum([
    "APPROVE",
    "REJECT",
    "REQUEST_CHANGES",
    "PUBLISH",
    "SCHEDULE_PUBLISH",
    "UNPUBLISH",
    "CANCEL",
    "ARCHIVE",
    "DUPLICATE",
    "FEATURE",
    "TRENDING",
    "RECOMMENDED",
  ]),
  reason: z.string().trim().max(2000).optional(),
  scheduledPublishAt: z.coerce.date().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManagementUser(request, ["ADMIN"]);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const before = await Event.findById(id).lean();
    if (!before)
      return NextResponse.json({ error: "Event not found." }, { status: 404 });

    if (input.action === "DUPLICATE") {
      const duplicate = await Event.create({
        ...before,
        _id: undefined,
        slug: `${before.slug}-copy-${Date.now().toString(36)}`,
        title: `${before.title} (copy)`,
        status: "DRAFT",
        approvalStatus: "PENDING",
        active: true,
        featured: false,
        trending: false,
        recommended: false,
        scheduledPublishAt: undefined,
        moderationNote: undefined,
        rejectionReason: undefined,
        archivedAt: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
      await writeAuditLog({
        request,
        actorId: actor.id,
        actorRole: "ADMIN",
        action: "EVENT_DUPLICATED",
        resourceType: "Event",
        resourceId: duplicate._id.toString(),
        after: { sourceEventId: id, title: duplicate.title },
      });
      return NextResponse.json({ event: duplicate }, { status: 201 });
    }

    const promotionField =
      input.action === "FEATURE"
        ? "featured"
        : input.action === "TRENDING"
          ? "trending"
          : input.action === "RECOMMENDED"
            ? "recommended"
            : null;
    const update = promotionField
      ? { [promotionField]: input.enabled ?? true }
      : input.action === "APPROVE"
        ? { approvalStatus: "APPROVED", moderationNote: input.reason }
        : input.action === "REJECT"
          ? {
              approvalStatus: "REJECTED",
              status: "DRAFT",
              rejectionReason: input.reason ?? "Rejected by an administrator.",
            }
          : input.action === "REQUEST_CHANGES"
            ? {
                approvalStatus: "CHANGES_REQUESTED",
                status: "DRAFT",
                moderationNote:
                  input.reason ?? "Changes requested by an administrator.",
              }
            : input.action === "PUBLISH"
              ? {
                  approvalStatus: "APPROVED",
                  status: "PUBLISHED",
                  active: true,
                  scheduledPublishAt: undefined,
                }
              : input.action === "SCHEDULE_PUBLISH"
                ? {
                    approvalStatus: "APPROVED",
                    scheduledPublishAt: input.scheduledPublishAt,
                  }
                : input.action === "UNPUBLISH"
                  ? { status: "DRAFT", active: false }
                  : input.action === "ARCHIVE"
                    ? {
                        status: "ARCHIVED",
                        active: false,
                        archivedAt: new Date(),
                      }
                    : { status: "CANCELLED", active: false };
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    ).lean();

    if (input.action === "CANCEL") {
      const shows = await Show.find({ event: id }).select("_id").lean();
      const showIds = shows.map((show) => show._id);
      await Show.updateMany(
        { _id: { $in: showIds } },
        { $set: { bookingStatus: "CANCELLED", active: false } },
      );
      const bookings = await Booking.find({
        show: { $in: showIds },
        status: { $in: ["CONFIRMED", "REFUND_PENDING"] },
      })
        .select("_id user pricing.total")
        .lean();
      await Booking.updateMany(
        { _id: { $in: bookings.map((booking) => booking._id) } },
        { $set: { status: "REFUND_PENDING" } },
      );
      if (bookings.length) {
        const payments = await Payment.find({
          booking: { $in: bookings.map((booking) => booking._id) },
          status: "SUCCESS",
        })
          .select("_id booking")
          .lean();
        const paymentByBookingId = new Map(
          payments.map((payment) => [payment.booking.toString(), payment._id]),
        );
        await Refund.bulkWrite(
          bookings
            .filter((booking) => paymentByBookingId.has(booking._id.toString()))
            .map((booking) => ({
              updateOne: {
                filter: { booking: booking._id },
                update: {
                  $setOnInsert: {
                    booking: booking._id,
                    payment: paymentByBookingId.get(booking._id.toString()),
                    requestedAmount: booking.pricing.total,
                    approvedAmount: booking.pricing.total,
                    cancellationFee: 0,
                    reason: "Event cancelled by administrator",
                    status: "REQUESTED",
                    cancellationPolicyApplied: "EVENT_CANCELLED_BY_ADMIN",
                    idempotencyKey: `event-cancel-${id}-${booking._id}`,
                  },
                },
                upsert: true,
              },
            })),
          { ordered: false },
        );
      }
      const organizer = await Organizer.findById(before.organizer)
        .select("user")
        .lean();
      const notifications = [
        ...bookings.map((booking) => ({
          user: booking.user,
          title: "Event cancelled",
          body: `${before.title} was cancelled. Your refund is being reviewed.`,
          type: "EVENT" as const,
          eventKey: `event-cancel-${id}-${booking.user}`,
          metadata: { eventId: id, bookingId: booking._id.toString() },
        })),
        ...(organizer
          ? [
              {
                user: organizer.user,
                title: "Event cancelled",
                body: `${before.title} was cancelled. Ticket sales have stopped.`,
                type: "EVENT" as const,
                eventKey: `event-cancel-organizer-${id}-${organizer.user}`,
                metadata: { eventId: id },
              },
            ]
          : []),
      ];
      if (notifications.length) {
        await Notification.bulkWrite(
          notifications.map((notification) => ({
            updateOne: {
              filter: { eventKey: notification.eventKey },
              update: { $setOnInsert: notification },
              upsert: true,
            },
          })),
          { ordered: false },
        );
      }
    }
    await writeAuditLog({
      request,
      actorId: actor.id,
      actorRole: "ADMIN",
      action: `EVENT_${input.action}`,
      resourceType: "Event",
      resourceId: id,
      before,
      after: event,
    });
    return NextResponse.json({ event });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

import crypto from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Booking, GroupBooking, Payment, Show, User } from "@/models";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID.");

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  showId: objectId.optional(),
  paymentMode: z.enum(["PAY_TOGETHER", "SPLIT"]).default("PAY_TOGETHER"),
  invitees: z.array(z.string().trim().email()).max(20).default([]),
  idempotencyKey: z.string().trim().min(16).max(128),
});

const updateGroupSchema = z.object({
  showId: objectId.optional(),
  lockId: objectId.optional(),
  selectedSeats: z.array(z.string().trim().min(1).max(20)).max(30).optional(),
  paymentMode: z.enum(["PAY_TOGETHER", "SPLIT"]).optional(),
  invitees: z.array(z.string().trim().email()).max(20).optional(),
});

const attachBookingSchema = z.object({
  bookingId: objectId,
  assignedSeats: z.array(z.string().trim().min(1).max(20)).max(30).optional(),
});

export class GroupBookingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function dedupeInvitees(invitees: string[]) {
  return [...new Set(invitees.map(normalizeEmail))].map((email) => ({
    email,
    status: "INVITED",
    invitedAt: new Date(),
  }));
}

async function assertShow(showId?: string) {
  if (!showId) return null;
  const show = await Show.findOne({
    _id: showId,
    active: true,
    bookingStatus: "SCHEDULED",
  })
    .select("event movie")
    .lean();
  if (!show)
    throw new GroupBookingError("This show is no longer bookable.", 409);
  return show;
}

export async function createGroupBooking(userId: string, rawInput: unknown) {
  const parsed = createGroupSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new GroupBookingError(
      parsed.error.issues[0]?.message ?? "Invalid group booking request.",
    );
  const input = parsed.data;
  await connectToDatabase();

  const existing = await GroupBooking.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean();
  if (existing) {
    if (existing.creator.toString() !== userId)
      throw new GroupBookingError(
        "This idempotency key belongs to another group booking.",
        409,
      );
    return existing;
  }

  const show = await assertShow(input.showId);
  const creator = await User.findById(userId).select("email name").lean();
  const creatorEmail = creator?.email ? normalizeEmail(creator.email) : "";
  const members = dedupeInvitees(
    input.invitees.filter((email) => normalizeEmail(email) !== creatorEmail),
  );

  return GroupBooking.create({
    name: input.name,
    creator: userId,
    show: input.showId,
    event: show?.event,
    movie: show?.movie,
    paymentMode: input.paymentMode,
    members,
    status: members.length ? "INVITING" : "CREATED",
    inviteToken: inviteToken(),
    idempotencyKey: input.idempotencyKey,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

export async function listGroupBookings(userId: string) {
  await connectToDatabase();
  const user = await User.findById(userId).select("email").lean();
  const email = user?.email ? normalizeEmail(user.email) : "";
  return GroupBooking.find({
    $or: [
      { creator: userId },
      { "members.user": userId },
      ...(email ? [{ "members.email": email }] : []),
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function getGroupBooking(userId: string, groupId: string) {
  if (!objectId.safeParse(groupId).success)
    throw new GroupBookingError("Invalid group booking ID.");
  await connectToDatabase();
  const user = await User.findById(userId).select("email").lean();
  const email = user?.email ? normalizeEmail(user.email) : "";
  const group = await GroupBooking.findOne({
    _id: groupId,
    $or: [
      { creator: userId },
      { "members.user": userId },
      ...(email ? [{ "members.email": email }] : []),
    ],
  }).lean();
  if (!group) throw new GroupBookingError("Group booking not found.", 404);
  return group;
}

export async function updateGroupBooking(
  userId: string,
  groupId: string,
  rawInput: unknown,
) {
  if (!objectId.safeParse(groupId).success)
    throw new GroupBookingError("Invalid group booking ID.");
  const parsed = updateGroupSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new GroupBookingError(
      parsed.error.issues[0]?.message ?? "Invalid group update.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const show = await assertShow(input.showId);
  const update: Record<string, unknown> = {};
  if (input.showId) {
    update.show = input.showId;
    update.event = show?.event;
    update.movie = show?.movie;
  }
  if (input.lockId) update.lock = input.lockId;
  if (input.selectedSeats) update.selectedSeats = input.selectedSeats;
  if (input.paymentMode) update.paymentMode = input.paymentMode;
  if (input.invitees) update.members = dedupeInvitees(input.invitees);
  if (input.selectedSeats?.length) update.status = "SEATS_SELECTED";
  else if (input.invitees?.length) update.status = "INVITING";

  const group = await GroupBooking.findOneAndUpdate(
    { _id: groupId, creator: userId, status: { $nin: ["PAID", "CANCELLED"] } },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!group)
    throw new GroupBookingError(
      "Only the group creator can update this active group.",
      403,
    );
  return group;
}

export async function attachBookingToGroup(
  userId: string,
  groupId: string,
  rawInput: unknown,
) {
  if (!objectId.safeParse(groupId).success)
    throw new GroupBookingError("Invalid group booking ID.");
  const parsed = attachBookingSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new GroupBookingError(
      parsed.error.issues[0]?.message ?? "Invalid group checkout request.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: input.bookingId,
        user: userId,
        status: { $in: ["PENDING", "CONFIRMED"] },
      })
        .session(session)
        .lean();
      if (!booking)
        throw new GroupBookingError(
          "Booking not found for this customer.",
          404,
        );

      const group = await GroupBooking.findOne({
        _id: groupId,
        status: { $nin: ["PAID", "CANCELLED", "EXPIRED"] },
        $or: [{ creator: userId }, { "members.user": userId }],
      })
        .session(session)
        .lean();
      if (!group)
        throw new GroupBookingError(
          "You are not a member of this active group booking.",
          403,
        );
      if (group.show && group.show.toString() !== booking.show.toString())
        throw new GroupBookingError(
          "This booking belongs to a different show.",
          409,
        );

      const assignedSeats =
        input.assignedSeats && input.assignedSeats.length > 0
          ? input.assignedSeats
          : booking.seats.map((seat) => seat.seatId);
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { groupBooking: group._id } },
        { session },
      );
      const payment = await Payment.findOne({ booking: booking._id })
        .session(session)
        .select("_id")
        .lean();
      if (payment) {
        await Payment.updateOne(
          { _id: payment._id },
          { $set: { groupBooking: group._id } },
          { session },
        );
      }

      const isCreator = group.creator.toString() === userId;
      if (isCreator) {
        await GroupBooking.updateOne(
          { _id: group._id },
          {
            $set: {
              show: booking.show,
              status: "CHECKOUT_STARTED",
              selectedSeats: [
                ...new Set([...group.selectedSeats, ...assignedSeats]),
              ],
            },
          },
          { session },
        );
      } else {
        await GroupBooking.updateOne(
          { _id: group._id, "members.user": userId },
          {
            $set: {
              status: "CHECKOUT_STARTED",
              "members.$.booking": booking._id,
              "members.$.assignedSeats": assignedSeats,
              "members.$.status":
                booking.status === "CONFIRMED" ? "PAID" : "JOINED",
            },
            $addToSet: { selectedSeats: { $each: assignedSeats } },
          },
          { session },
        );
      }
      result = await GroupBooking.findById(group._id).session(session).lean();
    });
    return result;
  } finally {
    await session.endSession();
  }
}

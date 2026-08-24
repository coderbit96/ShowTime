import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { MembershipPlan, MembershipSubscription, WalletPass } from "@/models";
import { debitWallet, WalletError } from "@/lib/wallet/wallet-service";

const subscribeSchema = z.object({
  planId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid membership plan."),
  idempotencyKey: z.string().trim().min(16).max(128),
});

export class MembershipError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function listMembershipPlans(userId?: string) {
  await connectToDatabase();
  const [plans, activeSubscription] = await Promise.all([
    MembershipPlan.find({ active: true }).sort({ price: 1 }).lean(),
    userId
      ? MembershipSubscription.findOne({
          user: userId,
          status: "ACTIVE",
          endsAt: { $gt: new Date() },
        })
          .populate("plan")
          .lean()
      : null,
  ]);
  return { plans, activeSubscription };
}

export async function getActiveMembership(
  userId: string,
  session?: mongoose.ClientSession,
) {
  return MembershipSubscription.findOne({
    user: userId,
    status: "ACTIVE",
    endsAt: { $gt: new Date() },
  })
    .populate("plan")
    .session(session ?? null)
    .lean();
}

export async function subscribeWithWallet(userId: string, rawInput: unknown) {
  const parsed = subscribeSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new MembershipError(
      parsed.error.issues[0]?.message ?? "Invalid membership request.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const existing = await MembershipSubscription.findOne({
        idempotencyKey: input.idempotencyKey,
      })
        .session(session)
        .lean();
      if (existing) {
        if (existing.user.toString() !== userId)
          throw new MembershipError(
            "This idempotency key belongs to another membership.",
            409,
          );
        result = existing;
        return;
      }
      const plan = await MembershipPlan.findOne({
        _id: input.planId,
        active: true,
      })
        .session(session)
        .lean();
      if (!plan) throw new MembershipError("Membership plan not found.", 404);
      const now = new Date();
      const endsAt = new Date(now.getTime() + plan.durationDays * 86400000);
      if (plan.price > 0) {
        try {
          await debitWallet({
            userId,
            amount: plan.price,
            source: "MEMBERSHIP",
            idempotencyKey: `membership-wallet:${input.idempotencyKey}`,
            session,
            note: `Membership: ${plan.name}`,
          });
        } catch (error) {
          if (error instanceof WalletError) throw error;
          throw new MembershipError("Unable to debit wallet.", 409);
        }
      }
      const [subscription] = await MembershipSubscription.create(
        [
          {
            user: userId,
            plan: plan._id,
            startsAt: now,
            endsAt,
            status: "ACTIVE",
            idempotencyKey: input.idempotencyKey,
          },
        ],
        { session },
      );
      await WalletPass.create(
        [
          {
            user: userId,
            membership: subscription._id,
            passId: `PASS-${subscription._id.toString().slice(-12).toUpperCase()}`,
            title: plan.name,
            startsAt: now,
            expiresAt: endsAt,
            status: "ACTIVE",
            metadata: { type: "MEMBERSHIP", plan: plan.slug },
          },
        ],
        { session },
      );
      result = subscription;
    });
    return result;
  } finally {
    await session.endSession();
  }
}

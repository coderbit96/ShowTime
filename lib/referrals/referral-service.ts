import crypto from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Referral, User } from "@/models";
import { creditWallet } from "@/lib/wallet/wallet-service";

const redeemSchema = z.object({
  code: z.string().trim().min(4).max(32),
  idempotencyKey: z.string().trim().min(16).max(128),
});

export class ReferralError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function makeReferralCode() {
  return `ST${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function getOrCreateReferralCode(userId: string) {
  await connectToDatabase();
  const existing = await Referral.findOne({ referrer: userId }).lean();
  if (existing) return existing;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Referral.create({
        referrer: userId,
        code: makeReferralCode(),
        status: "INVITED",
      });
    } catch {
      // Retry on rare code collision.
    }
  }
  throw new ReferralError("Unable to create referral code.", 500);
}

export async function redeemReferral(userId: string, rawInput: unknown) {
  const parsed = redeemSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new ReferralError(
      parsed.error.issues[0]?.message ?? "Invalid referral request.",
    );
  const input = parsed.data;
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session).lean();
      if (!user) throw new ReferralError("Customer not found.", 404);
      const referral = await Referral.findOne({
        code: input.code.toUpperCase(),
        status: { $in: ["INVITED", "SIGNED_UP"] },
      }).session(session);
      if (!referral)
        throw new ReferralError("Referral code is invalid or expired.", 404);
      if (referral.referrer.toString() === userId)
        throw new ReferralError("You cannot redeem your own referral.", 409);
      const alreadyReferred = await Referral.exists({
        referredUser: userId,
        status: "REWARDED",
      }).session(session);
      if (alreadyReferred)
        throw new ReferralError("Referral already redeemed.", 409);
      referral.referredUser = user._id;
      referral.status = "REWARDED";
      referral.idempotencyKey = input.idempotencyKey;
      referral.rewardedAt = new Date();
      await referral.save({ session });
      await creditWallet({
        userId: referral.referrer.toString(),
        points: referral.rewardPoints,
        amount: referral.rewardAmount,
        source: "REFERRAL",
        idempotencyKey: `referral-referrer:${referral._id}`,
        session,
        note: "Referral reward",
      });
      await creditWallet({
        userId,
        points: Math.floor(referral.rewardPoints / 2),
        source: "REFERRAL",
        idempotencyKey: `referral-referred:${referral._id}`,
        session,
        note: "Referral signup reward",
      });
      result = referral.toObject();
    });
    return result;
  } finally {
    await session.endSession();
  }
}

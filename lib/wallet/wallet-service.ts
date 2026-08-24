import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Wallet, WalletTransaction } from "@/models";

export class WalletError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function getOrCreateWallet(
  userId: string,
  session?: mongoose.ClientSession,
) {
  await connectToDatabase();
  const existing = await Wallet.findOne({ user: userId }).session(
    session ?? null,
  );
  if (existing) return existing;
  try {
    const [wallet] = await Wallet.create([{ user: userId }], { session });
    return wallet;
  } catch {
    const raced = await Wallet.findOne({ user: userId }).session(
      session ?? null,
    );
    if (!raced) throw new WalletError("Unable to create wallet.", 500);
    return raced;
  }
}

export async function listWalletActivity(userId: string) {
  await connectToDatabase();
  const wallet = await getOrCreateWallet(userId);
  const transactions = await WalletTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return { wallet: wallet.toObject(), transactions };
}

export async function creditWallet({
  userId,
  amount = 0,
  points = 0,
  source,
  idempotencyKey,
  booking,
  payment,
  foodOrder,
  note,
  session,
}: {
  userId: string;
  amount?: number;
  points?: number;
  source:
    | "TOP_UP"
    | "BOOKING"
    | "REFERRAL"
    | "REWARD"
    | "REFUND"
    | "FOOD"
    | "MEMBERSHIP"
    | "ADMIN";
  idempotencyKey: string;
  booking?: string | mongoose.Types.ObjectId;
  payment?: string | mongoose.Types.ObjectId;
  foodOrder?: string | mongoose.Types.ObjectId;
  note?: string;
  session?: mongoose.ClientSession;
}) {
  if (amount < 0 || points < 0)
    throw new WalletError("Wallet credits cannot be negative.");
  const existing = await WalletTransaction.findOne({ idempotencyKey })
    .session(session ?? null)
    .lean();
  if (existing) return existing;
  const wallet = await getOrCreateWallet(userId, session);
  wallet.balance += amount;
  wallet.rewardPoints += points;
  await wallet.save({ session });
  const [transaction] = await WalletTransaction.create(
    [
      {
        wallet: wallet._id,
        user: userId,
        booking,
        payment,
        foodOrder,
        type: points ? "REWARD_EARN" : "CREDIT",
        source,
        amount,
        points,
        balanceAfter: wallet.balance,
        pointsAfter: wallet.rewardPoints,
        idempotencyKey,
        note,
      },
    ],
    { session },
  );
  return transaction;
}

export async function debitWallet({
  userId,
  amount = 0,
  points = 0,
  source,
  idempotencyKey,
  foodOrder,
  note,
  session,
}: {
  userId: string;
  amount?: number;
  points?: number;
  source: "BOOKING" | "REWARD" | "FOOD" | "MEMBERSHIP";
  idempotencyKey: string;
  foodOrder?: string | mongoose.Types.ObjectId;
  note?: string;
  session?: mongoose.ClientSession;
}) {
  if (amount < 0 || points < 0)
    throw new WalletError("Wallet debits cannot be negative.");
  const existing = await WalletTransaction.findOne({ idempotencyKey })
    .session(session ?? null)
    .lean();
  if (existing) return existing;
  const wallet = await getOrCreateWallet(userId, session);
  if (wallet.balance < amount)
    throw new WalletError("Insufficient wallet balance.", 409);
  if (wallet.rewardPoints < points)
    throw new WalletError("Insufficient reward points.", 409);
  wallet.balance -= amount;
  wallet.rewardPoints -= points;
  await wallet.save({ session });
  const [transaction] = await WalletTransaction.create(
    [
      {
        wallet: wallet._id,
        user: userId,
        foodOrder,
        type: points ? "REWARD_REDEEM" : "DEBIT",
        source,
        amount,
        points,
        balanceAfter: wallet.balance,
        pointsAfter: wallet.rewardPoints,
        idempotencyKey,
        note,
      },
    ],
    { session },
  );
  return transaction;
}

export function pointsForBooking(total: number, multiplier = 1) {
  return Math.max(0, Math.floor((total / 20) * multiplier));
}

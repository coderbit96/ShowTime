import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

type DemoAccount = {
  role: "CUSTOMER" | "ORGANIZER" | "ADMIN";
  email: string;
  password: string;
  name: string;
  organizationName?: string;
};

const defaultPassword = "ShowTime@12345";

const accounts: DemoAccount[] = [
  {
    role: "CUSTOMER",
    email: process.env.DEMO_CUSTOMER_EMAIL ?? "customer@showtime.local",
    password: process.env.DEMO_CUSTOMER_PASSWORD ?? defaultPassword,
    name: process.env.DEMO_CUSTOMER_NAME ?? "Demo Customer",
  },
  {
    role: "ORGANIZER",
    email: process.env.DEMO_ORGANIZER_EMAIL ?? "organizer@showtime.local",
    password: process.env.DEMO_ORGANIZER_PASSWORD ?? defaultPassword,
    name: process.env.DEMO_ORGANIZER_NAME ?? "Demo Organizer",
    organizationName:
      process.env.DEMO_ORGANIZER_ORGANIZATION ?? "Demo Organizer Studio",
  },
  {
    role: "ADMIN",
    email: process.env.DEMO_ADMIN_EMAIL ?? "admin@showtime.local",
    password: process.env.DEMO_ADMIN_PASSWORD ?? defaultPassword,
    name: process.env.DEMO_ADMIN_NAME ?? "Demo Admin",
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function upsertFirebaseUser(account: DemoAccount) {
  const { getFirebaseAdminAuth } = await import("../lib/firebase/admin");
  const auth = getFirebaseAdminAuth();

  try {
    const existingUser = await auth.getUserByEmail(account.email);
    await auth.updateUser(existingUser.uid, {
      disabled: false,
      displayName: account.name,
      emailVerified: true,
      password: account.password,
    });
    return existingUser.uid;
  } catch (error) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code !== "auth/user-not-found") {
      throw error;
    }

    const user = await auth.createUser({
      disabled: false,
      displayName: account.name,
      email: account.email,
      emailVerified: true,
      password: account.password,
    });
    return user.uid;
  }
}

async function upsertMongoUser(
  account: DemoAccount,
  firebaseUid: string,
  models: Awaited<typeof import("../models")>,
) {
  const { Organizer, User } = models;
  const user = await User.findOneAndUpdate(
    { firebaseUid },
    {
      $set: {
        active: true,
        email: account.email,
        firebaseUid,
        name: account.name,
        role: account.role,
      },
    },
    { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
  );

  if (account.role === "ORGANIZER") {
    const organizationName =
      account.organizationName ?? `${account.name} Organization`;
    await Organizer.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          active: true,
          canCreateVenues: true,
          contactEmail: account.email,
          organizationName,
          payoutEnabled: true,
          slug: slugify(organizationName),
          verificationStatus: "VERIFIED",
        },
      },
      { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
    );
  }

  return user;
}

async function main() {
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  const models = await import("../models");

  await connectToDatabase();

  for (const account of accounts) {
    const firebaseUid = await upsertFirebaseUser(account);
    const user = await upsertMongoUser(account, firebaseUid, models);
    console.log(
      `${account.role.padEnd(9)} ${account.email} / ${account.password} -> ${user._id.toString()}`,
    );
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });

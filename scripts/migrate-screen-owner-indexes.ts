import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  const { Screen } = await import("../models");

  await connectToDatabase();
  const existing = await Screen.collection.indexes();
  const indexNames = new Set(existing.map((index) => index.name));

  for (const name of ["cinema_1_name_1", "venue_1_name_1"]) {
    if (indexNames.has(name)) await Screen.collection.dropIndex(name);
  }

  await Screen.collection.createIndex(
    { cinema: 1, name: 1 },
    {
      name: "cinema_1_name_1",
      unique: true,
      partialFilterExpression: { cinema: { $exists: true, $type: "objectId" } },
    },
  );
  await Screen.collection.createIndex(
    { venue: 1, name: 1 },
    {
      name: "venue_1_name_1",
      unique: true,
      partialFilterExpression: { venue: { $exists: true, $type: "objectId" } },
    },
  );

  console.log("Screen owner indexes migrated.");
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

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  const { Movie } = await import("../models");
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  await connectToDatabase();
  const indexes = await Movie.collection.indexes();
  const movieTextIndex = indexes.find(
    (index) => index.key._fts === "text" && index.weights?.title === 1,
  );

  if (movieTextIndex?.language_override !== "textLanguage") {
    if (movieTextIndex) {
      if (!movieTextIndex.name)
        throw new Error("Movie text index has no name.");
      await Movie.collection.dropIndex(movieTextIndex.name);
      console.log(`Dropped legacy movie text index: ${movieTextIndex.name}`);
    }
    await Movie.collection.createIndex(
      {
        title: "text",
        description: "text",
        genre: "text",
        "cast.name": "text",
      },
      { name: "movie_search_text", language_override: "textLanguage" },
    );
    console.log("Created movie_search_text with textLanguage override.");
  } else {
    console.log("movie_search_text is already configured correctly.");
  }

  const parallelArrayIndex = indexes.find(
    (index) => index.key.language === 1 && index.key.genre === 1,
  );
  if (parallelArrayIndex) {
    if (!parallelArrayIndex.name)
      throw new Error("Parallel-array index has no name.");
    await Movie.collection.dropIndex(parallelArrayIndex.name);
    console.log(
      `Dropped invalid parallel-array index: ${parallelArrayIndex.name}`,
    );
  }

  await mongoose.disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});

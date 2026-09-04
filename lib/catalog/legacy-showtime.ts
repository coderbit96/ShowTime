import { connectToDatabase } from "@/lib/mongodb/connect";
import { Movie, Show } from "@/models";
import { mockCatalog } from "./mock-catalog";

const legacyMovieShowId = /^show-(movie-[a-z0-9-]+)-(\d{4}-\d{2}-\d{2})-(\d+)$/;

/**
 * Converts short-lived pre-database catalogue show IDs into their persisted
 * equivalents. This keeps old shared links working after the catalogue moves
 * from mock showtimes to real, lockable shows.
 */
export async function resolveLegacyMovieShowId(showId: string) {
  const match = legacyMovieShowId.exec(showId);
  if (!match) return null;

  const [, catalogMovieId, dateKey, timeIndexText] = match;
  const movie = mockCatalog.find(
    (item) => item.id === catalogMovieId && item.category === "Movie",
  );
  if (!movie) return null;

  const dayStart = new Date(`${dateKey}T00:00:00+05:30`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const timeIndex = Number(timeIndexText);
  if (!Number.isSafeInteger(timeIndex) || timeIndex < 0) return null;

  try {
    await connectToDatabase();
    const persistedMovie = await Movie.findOne({
      slug: movie.slug,
      active: true,
    })
      .select("_id")
      .lean();
    if (!persistedMovie) return null;

    const show = await Show.findOne({
      movie: persistedMovie._id,
      contentType: "MOVIE",
      active: true,
      bookingStatus: { $in: ["SCHEDULED", "SOLD_OUT"] },
      date: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ startTime: 1 })
      .skip(timeIndex)
      .select("_id")
      .lean();
    return show?._id.toString() ?? null;
  } catch {
    return null;
  }
}

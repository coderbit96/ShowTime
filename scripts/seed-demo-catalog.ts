import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

type DemoMovie = {
  slug: string;
  title: string;
  poster: string;
  description: string;
  language: string[];
  genre: string[];
  duration: number;
  rating: number;
  cinema: { name: string; address: string; slug: string };
  screenName?: string;
  prices: { REGULAR: number; PREMIUM: number; RECLINER: number };
};

const demoMovies: DemoMovie[] = [
  {
    slug: "the-last-forest",
    title: "The Last Forest",
    poster: "/images/catalog/the-last-forest.png",
    description:
      "When a conservation researcher returns to the forest that shaped her childhood, an unexpected discovery turns a quiet homecoming into a race to protect a living world on the edge.",
    language: ["Hindi", "English"],
    genre: ["Drama", "Mystery"],
    duration: 132,
    rating: 8.6,
    cinema: {
      name: "INOX: South City",
      address: "South City Mall, Prince Anwar Shah Road, Kolkata",
      slug: "inox-south-city",
    },
    prices: { REGULAR: 220, PREMIUM: 280, RECLINER: 420 },
  },
  {
    slug: "indigo-summer",
    title: "Indigo Summer",
    poster: "/images/catalog/indigo-summer.png",
    description:
      "A restless songwriter and a meticulous architect meet during one monsoon season, finding that the plans they have been following are not the lives they want.",
    language: ["Hindi"],
    genre: ["Romance", "Music"],
    duration: 124,
    rating: 8.1,
    cinema: {
      name: "PVR: Mani Square Mall",
      address: "Mani Square Mall, EM Bypass, Kolkata",
      slug: "pvr-mani-square-mall",
    },
    prices: { REGULAR: 190, PREMIUM: 250, RECLINER: 390 },
  },
  {
    slug: "orbit-9",
    title: "Orbit 9",
    poster: "/images/catalog/orbit-9.png",
    description:
      "A daring crew crosses the last uncharted edge of the solar system, where a signal from the deep asks them to question everything they came to find.",
    language: ["English", "Hindi"],
    genre: ["Sci-fi", "Adventure"],
    duration: 140,
    rating: 7.9,
    cinema: {
      name: "Cinepolis: Acropolis Mall",
      address: "Acropolis Mall, Rashbehari Avenue, Kolkata",
      slug: "cinepolis-acropolis-mall",
    },
    prices: { REGULAR: 240, PREMIUM: 300, RECLINER: 450 },
  },
  {
    slug: "paper-lanterns",
    title: "Paper Lanterns",
    poster: "/images/catalog/paper-lanterns.png",
    description:
      "A young artist returns to the riverside festival that inspired her first work, where one unfinished lantern leads her toward a long-buried family story.",
    language: ["Bengali", "Hindi"],
    genre: ["Drama", "Romance"],
    duration: 128,
    rating: 8.4,
    cinema: {
      name: "PVR: Mani Square Mall",
      address: "Mani Square Mall, EM Bypass, Kolkata",
      slug: "pvr-mani-square-mall",
    },
    screenName: "Screen 2",
    prices: { REGULAR: 210, PREMIUM: 270, RECLINER: 410 },
  },
  {
    slug: "after-the-last-tram",
    title: "After the Last Tram",
    poster: "/images/catalog/after-the-last-tram.png",
    description:
      "On Kolkata's final tram of the night, a missed call draws a reluctant detective into a rain-soaked mystery that refuses to end at the depot.",
    language: ["Hindi", "English"],
    genre: ["Mystery", "Thriller"],
    duration: 116,
    rating: 8,
    cinema: {
      name: "Cinepolis: Acropolis Mall",
      address: "Acropolis Mall, Rashbehari Avenue, Kolkata",
      slug: "cinepolis-acropolis-mall",
    },
    screenName: "Screen 2",
    prices: { REGULAR: 230, PREMIUM: 290, RECLINER: 440 },
  },
  {
    slug: "neon-monsoon",
    title: "Neon Monsoon",
    poster: "/images/catalog/neon-monsoon.png",
    description:
      "When an overnight monsoon turns Kolkata into a maze of neon and rain, two strangers discover that the city has one more chance for them to find each other.",
    language: ["Hindi", "Bengali"],
    genre: ["Romance", "Drama"],
    duration: 122,
    rating: 8.3,
    cinema: {
      name: "PVR: Mani Square Mall",
      address: "Mani Square Mall, EM Bypass, Kolkata",
      slug: "pvr-mani-square-mall",
    },
    screenName: "Screen 3",
    prices: { REGULAR: 250, PREMIUM: 310, RECLINER: 460 },
  },
  {
    slug: "the-tea-house-at-dawn",
    title: "The Tea House at Dawn",
    poster: "/images/catalog/the-tea-house-at-dawn.png",
    description:
      "A careful archivist finds an unsigned letter hidden in a heritage tea house, and the first dawn of the Puja season changes the story she has told herself for years.",
    language: ["Bengali", "English"],
    genre: ["Drama", "Mystery"],
    duration: 112,
    rating: 8.5,
    cinema: {
      name: "INOX: South City",
      address: "South City Mall, Prince Anwar Shah Road, Kolkata",
      slug: "inox-south-city",
    },
    screenName: "Screen 2",
    prices: { REGULAR: 200, PREMIUM: 260, RECLINER: 400 },
  },
  {
    slug: "velvet-signal",
    title: "Velvet Signal",
    poster: "/images/catalog/velvet-signal.png",
    description:
      "A signal that should have gone silent years ago lights up over the Hooghly, sending a reluctant investigator into a night where every reflection hides a different truth.",
    language: ["Hindi", "English"],
    genre: ["Thriller", "Action"],
    duration: 130,
    rating: 7.8,
    cinema: {
      name: "Cinepolis: Acropolis Mall",
      address: "Acropolis Mall, Rashbehari Avenue, Kolkata",
      slug: "cinepolis-acropolis-mall",
    },
    screenName: "Screen 3",
    prices: { REGULAR: 270, PREMIUM: 330, RECLINER: 480 },
  },
];

const showTimes = [
  { hour: 16, minute: 15 },
  { hour: 19, minute: 10 },
  { hour: 22, minute: 5 },
];

const seatingRows = [
  { label: "A", category: "REGULAR" as const, count: 10 },
  { label: "B", category: "REGULAR" as const, count: 10 },
  { label: "C", category: "PREMIUM" as const, count: 10 },
  { label: "D", category: "PREMIUM" as const, count: 10 },
  { label: "E", category: "RECLINER" as const, count: 8 },
];

function kolkataDate(daysFromToday: number, hour: number, minute: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return new Date(
    `${date.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`,
  );
}

async function main() {
  const { connectToDatabase } = await import("../lib/mongodb/connect");
  const { Cinema, City, Movie, Screen, SeatLayout, Show } =
    await import("../models");

  await connectToDatabase();
  const city = await City.findOneAndUpdate(
    { slug: "kolkata" },
    {
      $set: {
        name: "Kolkata",
        slug: "kolkata",
        state: "West Bengal",
        country: "India",
        featured: true,
        active: true,
        location: { type: "Point", coordinates: [88.3639, 22.5726] },
      },
    },
    { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
  );

  const rows = seatingRows.map((row) => ({
    label: row.label,
    seats: Array.from({ length: row.count }, (_, index) => ({
      seatId: `${row.label}${index + 1}`,
      row: row.label,
      number: index + 1,
      category: row.category,
      active: true,
    })),
  }));
  const layout = await SeatLayout.findOneAndUpdate(
    { name: "Show Time Kolkata Demo Layout" },
    {
      $set: {
        name: "Show Time Kolkata Demo Layout",
        rows,
        categories: ["REGULAR", "PREMIUM", "RECLINER"],
        totalSeats: rows.reduce((total, row) => total + row.seats.length, 0),
        active: true,
      },
    },
    { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
  );

  for (const entry of demoMovies) {
    const movie = await Movie.findOneAndUpdate(
      { slug: entry.slug },
      {
        $set: {
          title: entry.title,
          slug: entry.slug,
          poster: entry.poster,
          banner: entry.poster,
          description: entry.description,
          language: entry.language,
          genre: entry.genre,
          duration: entry.duration,
          certificate: "UA 13+",
          releaseDate: kolkataDate(0, 0, 0),
          rating: entry.rating,
          formats: ["2D"],
          availabilityStatus: "NOW_SHOWING",
          active: true,
        },
      },
      { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
    );
    const cinema = await Cinema.findOneAndUpdate(
      { slug: entry.cinema.slug },
      {
        $set: {
          name: entry.cinema.name,
          slug: entry.cinema.slug,
          address: entry.cinema.address,
          city: city._id,
          location: { type: "Point", coordinates: [88.4, 22.58] },
          active: true,
        },
      },
      { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
    );
    const screen = await Screen.findOneAndUpdate(
      { cinema: cinema._id, name: entry.screenName ?? "Screen 1" },
      {
        $set: {
          name: entry.screenName ?? "Screen 1",
          cinema: cinema._id,
          seatLayout: layout._id,
          capacity: layout.totalSeats,
          rowConfiguration: seatingRows.map((row) => ({
            label: row.label,
            seatCount: row.count,
            category: row.category,
          })),
          seatCategories: ["REGULAR", "PREMIUM", "RECLINER"],
          active: true,
        },
      },
      { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
    );
    const seatAvailability = rows.flatMap((row) =>
      row.seats.map((seat) => ({
        seatId: seat.seatId,
        category: seat.category,
        status: "AVAILABLE" as const,
      })),
    );

    for (let day = 0; day < 3; day += 1) {
      for (const time of showTimes) {
        const startTime = kolkataDate(day, time.hour, time.minute);
        const endTime = new Date(startTime.getTime() + entry.duration * 60_000);
        await Show.findOneAndUpdate(
          { screen: screen._id, startTime },
          {
            $set: {
              contentType: "MOVIE",
              movie: movie._id,
              city: city._id,
              cinema: cinema._id,
              screen: screen._id,
              date: kolkataDate(day, 0, 0),
              startTime,
              endTime,
              pricing: Object.entries(entry.prices).map(
                ([category, price]) => ({
                  category,
                  price,
                  currency: "INR",
                }),
              ),
              bookingLimits: { maxSeatsPerBooking: 10 },
              seatAvailability,
              bookingStatus: "SCHEDULED",
              active: true,
            },
          },
          { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
        );
      }
    }
    console.log(`${entry.title}: 9 Kolkata shows ready`);
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

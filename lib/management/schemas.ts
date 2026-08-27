import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "A valid record ID is required.");
const optionalContact = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
});
const coordinates = z.tuple([z.number(), z.number()]).optional();

export const venueSchema = z.object({
  name: z.string().trim().min(2).max(140),
  address: z.string().trim().min(5).max(400),
  city: objectId,
  capacity: z.coerce.number().int().min(1).max(500_000),
  venueType: z.enum([
    "AUDITORIUM",
    "ARENA",
    "CLUB",
    "OPEN_AIR",
    "STADIUM",
    "THEATRE",
    "OTHER",
  ]),
  parkingAvailable: z.boolean().optional().default(false),
  seatingType: z
    .enum(["FIXED", "FLEXIBLE", "STANDING", "MIXED"])
    .optional()
    .default("FIXED"),
  assignedOrganizer: objectId.optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  contact: optionalContact.default({}),
  images: z.array(z.string().url()).max(12).default([]),
  coordinates,
});

export const cinemaSchema = z.object({
  name: z.string().trim().min(2).max(140),
  address: z.string().trim().min(5).max(400),
  city: objectId,
  chain: z.string().trim().max(120).optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  contact: optionalContact.default({}),
  coordinates,
});

export const screenRowSchema = z.object({
  label: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]+$/, "Use a short row label such as A or B1."),
  seatCount: z.coerce.number().int().min(1).max(80),
  category: z.enum(["REGULAR", "PREMIUM", "RECLINER", "VIP"]),
});

export const screenSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    cinema: objectId.optional(),
    venue: objectId.optional(),
    rows: z.array(screenRowSchema).min(1).max(40),
  })
  .refine((value) => Boolean(value.cinema) !== Boolean(value.venue), {
    message: "Choose either a cinema or a venue for the screen.",
    path: ["cinema"],
  });

export const updateVenueSchema = venueSchema.partial().extend({
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  operationalStatus: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
  active: z.boolean().optional(),
});
export const updateCinemaSchema = cinemaSchema
  .partial()
  .extend({ active: z.boolean().optional() });
export const updateScreenSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    cinema: objectId.optional(),
    venue: objectId.optional(),
    rows: z.array(screenRowSchema).min(1).max(40).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => !(value.cinema && value.venue), {
    message: "Choose either a cinema or a venue for the screen.",
    path: ["cinema"],
  });

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function makeSeatRows(
  rows: Array<{
    label: string;
    seatCount: number;
    category: "REGULAR" | "PREMIUM" | "RECLINER" | "VIP";
  }>,
) {
  return rows.map((row) => ({
    label: row.label.toUpperCase(),
    seats: Array.from({ length: row.seatCount }, (_, index) => ({
      seatId: `${row.label.toUpperCase()}${index + 1}`,
      row: row.label.toUpperCase(),
      number: index + 1,
      category: row.category,
      active: true,
    })),
  }));
}

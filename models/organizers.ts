import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const OrganizerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
      index: true,
    },
    payoutEnabled: { type: Boolean, default: false },
    canCreateVenues: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

OrganizerSchema.index({ user: 1 }, { unique: true });
OrganizerSchema.index({ slug: 1 }, { unique: true });
OrganizerSchema.index({ verificationStatus: 1, active: 1 });
OrganizerSchema.index({ verificationStatus: 1, canCreateVenues: 1, active: 1 });

export interface IOrganizer extends InferSchemaType<typeof OrganizerSchema> {}

export const Organizer = getModel<IOrganizer>(
  "Organizer",
  OrganizerSchema,
  "organizers",
);

export default Organizer;

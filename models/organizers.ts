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
    business: {
      legalName: { type: String, trim: true },
      registrationNumber: { type: String, trim: true },
      taxId: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    kycStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"],
      default: "NOT_SUBMITTED",
      index: true,
    },
    kycDocuments: {
      type: [
        {
          type: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
          submittedAt: { type: Date, default: Date.now },
          verifiedAt: { type: Date },
        },
      ],
      default: [],
    },
    bankDetails: {
      accountHolder: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountNumberLast4: { type: String, trim: true, maxlength: 4 },
      ifscCode: { type: String, trim: true },
      verified: { type: Boolean, default: false },
    },
    commissionRatePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },
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
OrganizerSchema.index({ kycStatus: 1, verificationStatus: 1, active: 1 });
OrganizerSchema.index({ verificationStatus: 1, canCreateVenues: 1, active: 1 });

export interface IOrganizer extends InferSchemaType<typeof OrganizerSchema> {}

export const Organizer = getModel<IOrganizer>(
  "Organizer",
  OrganizerSchema,
  "organizers",
);

export default Organizer;

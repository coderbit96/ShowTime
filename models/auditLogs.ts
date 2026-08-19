import { Schema, type InferSchemaType } from "mongoose";
import { getModel } from "./modelHelpers";

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: {
      type: String,
      enum: ["CUSTOMER", "ORGANIZER", "ADMIN", "SYSTEM"],
      required: true,
      index: true,
    },
    action: { type: String, required: true, trim: true, index: true },
    resourceType: { type: String, required: true, trim: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true },
);

AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export interface IAuditLog extends InferSchemaType<typeof AuditLogSchema> {}

export const AuditLog = getModel<IAuditLog>(
  "AuditLog",
  AuditLogSchema,
  "auditLogs",
);

export default AuditLog;

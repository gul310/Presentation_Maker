import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAuditLog extends Document {
  admin_id: Types.ObjectId;
  admin_email: string;
  action: string;
  target_type: "listing" | "order" | "user" | "presentation" | "settings" | "subscription" | "template" | "template_purchase" | "subscription_payment";
  target_id: string;
  details?: any;
  reason?: string | null;
  ip_address?: string | null;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    admin_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    admin_email: { type: String, required: true },
    action: { type: String, required: true, index: true },
    target_type: {
      type: String,
      enum: ["listing", "order", "user", "presentation", "settings", "subscription", "template", "template_purchase", "subscription_payment"],
      required: true,
      index: true
    },
    target_id: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    reason: { type: String, default: null },
    ip_address: { type: String, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false }
  }
);

AuditLogSchema.index({ created_at: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);


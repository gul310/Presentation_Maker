import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPlatformSettings extends Document {
  payment_provider: string;
  account_title: string;
  platform_payment_number: string;
  bank_details: string;
  payment_instructions: string;
  qr_code_url?: string | null;
  support_contact: string;
  commission_percentage: number;
  updated_by?: Types.ObjectId | null;
  updated_at: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    payment_provider: { type: String, default: "NayaPay" },
    account_title: { type: String, default: "Syeda Gul Andam Malik Kazmi" },
    platform_payment_number: { type: String, default: "03339114569" },
    bank_details: { type: String, default: "NayaPay (Transferable from any Bank app, Raast, JazzCash, or Easypaisa)" },
    payment_instructions: {
      type: String,
      default: "Transfer to NayaPay account 03339114569 (Title: Syeda Gul Andam Malik Kazmi). Enter your Transaction/Order Reference in the note and upload your receipt screenshot for Super Admin approval."
    },
    qr_code_url: { type: String, default: null },
    support_contact: { type: String, default: "support@presentai.com" },
    commission_percentage: { type: Number, default: 5 },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  {
    timestamps: { createdAt: false, updatedAt: "updated_at" }
  }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>(
  "PlatformSettings",
  PlatformSettingsSchema
);


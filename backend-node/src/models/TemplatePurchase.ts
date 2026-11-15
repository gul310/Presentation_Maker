import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITemplatePurchase extends Document {
  user_id: Types.ObjectId;
  template_id: Types.ObjectId;
  template_title: string;
  price_pkr: number;
  price_usd: number;
  payment_provider: string;
  transaction_ref: string;
  receipt_url?: string;
  payer_name?: string;
  payer_account?: string;
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "APPROVED" | "REJECTED";
  rejection_reason?: string;
  admin_notes?: string;
  verified_by?: Types.ObjectId | null;
  verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const TemplatePurchaseSchema = new Schema<ITemplatePurchase>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    template_id: { type: Schema.Types.ObjectId, ref: "Template", required: true, index: true },
    template_title: { type: String, required: true },
    price_pkr: { type: Number, required: true, min: 0 },
    price_usd: { type: Number, default: 0, min: 0 },
    payment_provider: { type: String, default: "NayaPay" },
    transaction_ref: { type: String, required: true, unique: true, index: true },
    receipt_url: { type: String, default: null },
    payer_name: { type: String, default: null },
    payer_account: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "APPROVED", "REJECTED"],
      default: "PENDING_PAYMENT",
      index: true
    },
    rejection_reason: { type: String, default: null },
    admin_notes: { type: String, default: null },
    verified_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verified_at: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const TemplatePurchase = mongoose.model<ITemplatePurchase>("TemplatePurchase", TemplatePurchaseSchema);


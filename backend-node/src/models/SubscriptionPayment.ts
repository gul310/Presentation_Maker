import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubscriptionPayment extends Document {
  user_id: Types.ObjectId;
  subscription_id?: Types.ObjectId | null;
  plan: "student" | "pro" | "team";
  payment_type: "initial" | "renewal" | "upgrade" | "downgrade" | "refund";
  billing_cycle_start: Date;
  billing_cycle_end: Date;
  gross_amount: number;
  amount_pkr?: number;
  gateway_fee: number;
  net_amount: number;
  currency: string;
  payment_status: "pending" | "completed" | "failed" | "cancelled" | "refunded" | "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "APPROVED" | "REJECTED";
  gateway_provider: string;
  gateway_reference?: string;
  transaction_ref?: string;
  payer_name?: string;
  payer_account?: string;
  rejection_reason?: string;
  verified_by?: Types.ObjectId | null;
  verified_at?: Date | null;
  idempotency_key?: string;
  payment_method: string;
  invoice_number: string;
  receipt_url?: string;
  metadata?: Record<string, any>;
  paid_at?: Date;
  refunded_amount?: number;
  refund_reason?: string;
  refunded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscription_id: { type: Schema.Types.ObjectId, ref: "Subscription", default: null, index: true },
    plan: { type: String, enum: ["student", "pro", "team"], required: true },
    payment_type: {
      type: String,
      enum: ["initial", "renewal", "upgrade", "downgrade", "refund"],
      default: "initial"
    },
    billing_cycle_start: { type: Date, default: Date.now },
    billing_cycle_end: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    gross_amount: { type: Number, required: true, min: 0 },
    amount_pkr: { type: Number, default: 0 },
    gateway_fee: { type: Number, required: true, min: 0, default: 0 },
    net_amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "PKR" },
    payment_status: {
      type: String,
      enum: [
        "pending", "completed", "failed", "cancelled", "refunded",
        "PENDING_PAYMENT", "PAYMENT_SUBMITTED", "APPROVED", "REJECTED"
      ],
      default: "PENDING_PAYMENT",
      index: true
    },
    gateway_provider: { type: String, required: true, default: "NayaPay" },
    gateway_reference: { type: String, default: null, index: true },
    transaction_ref: { type: String, default: null, index: true },
    payer_name: { type: String, default: null },
    payer_account: { type: String, default: null },
    rejection_reason: { type: String, default: null },
    verified_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verified_at: { type: Date, default: null },
    idempotency_key: { type: String, default: null, index: true },
    payment_method: { type: String, default: "NayaPay" },
    invoice_number: {
      type: String,
      default: () => `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      index: true
    },
    receipt_url: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    paid_at: { type: Date, default: null },
    refunded_amount: { type: Number, default: 0 },
    refund_reason: { type: String, default: null },
    refunded_at: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const SubscriptionPayment = mongoose.model<ISubscriptionPayment>(
  "SubscriptionPayment",
  SubscriptionPaymentSchema
);


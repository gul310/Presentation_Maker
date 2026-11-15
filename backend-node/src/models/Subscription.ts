import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubscription extends Document {
  user_id: Types.ObjectId;
  plan: "free" | "student" | "pro" | "team";
  status: "free" | "active" | "pending" | "past_due" | "expired" | "cancelled";
  amount: number;
  currency: string;
  billing_interval: "month" | "year";
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  gateway_provider: string;
  gateway_subscription_id?: string;
  gateway_customer_id?: string;
  renewal_reminder_sent?: boolean;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: {
      type: String,
      enum: ["free", "student", "pro", "team"],
      required: true,
      default: "free"
    },
    status: {
      type: String,
      enum: ["free", "active", "pending", "past_due", "expired", "cancelled"],
      required: true,
      default: "free",
      index: true
    },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "USD" },
    billing_interval: { type: String, enum: ["month", "year"], default: "month" },
    current_period_start: { type: Date, default: Date.now },
    current_period_end: { type: Date, required: true },
    cancel_at_period_end: { type: Boolean, default: false },
    canceled_at: { type: Date, default: null },
    gateway_provider: { type: String, default: "safepay" },
    gateway_subscription_id: { type: String, default: null, index: true },
    gateway_customer_id: { type: String, default: null },
    renewal_reminder_sent: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);


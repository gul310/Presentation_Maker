import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  role: "student" | "teacher" | "researcher" | "professional" | "admin";
  is_admin?: boolean;
  country: string;
  interface_language: string;
  presentation_language: string;
  app_theme_mode: "light" | "dark" | "system";
  app_color_theme: string;
  custom_primary_color?: string;
  is_active: boolean;
  seller_payment_info?: {
    payment_method?: string;
    account_title?: string;
    account_number?: string;
    bank_name?: string;
    instructions?: string;
  };
  subscription: {
    plan: "free" | "student" | "pro" | "team";
    status: "free" | "active" | "pending" | "past_due" | "expired" | "cancelled";
    renews_at?: Date;
    billing_interval?: "month" | "year";
    current_period_start?: Date;
    current_period_end?: Date;
    cancel_at_period_end?: boolean;
    gateway_subscription_id?: string;
    gateway_customer_id?: string;
    amount_paid?: number;
    currency?: string;
  };
  ai_credits: {
    total_granted: number;
    used: number;
    remaining: number;
  };
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "researcher", "professional", "admin"],
      default: "student",
      required: true
    },
    is_admin: { type: Boolean, default: false },
    seller_payment_info: {
      payment_method: { type: String, default: "Easypaisa" },
      account_title: { type: String, default: "" },
      account_number: { type: String, default: "" },
      bank_name: { type: String, default: "" },
      instructions: { type: String, default: "" }
    },
    country: { type: String, default: "Global" },
    interface_language: { type: String, default: "English" },
    presentation_language: { type: String, default: "English" },
    app_theme_mode: { type: String, enum: ["light", "dark", "system"], default: "dark" },
    app_color_theme: { type: String, default: "indigo" },
    custom_primary_color: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    subscription: {
      plan: { type: String, enum: ["free", "student", "pro", "team"], default: "free" },
      status: {
        type: String,
        enum: ["free", "active", "pending", "past_due", "expired", "cancelled"],
        default: "free"
      },
      renews_at: { type: Date, default: null },
      billing_interval: { type: String, enum: ["month", "year"], default: "month" },
      current_period_start: { type: Date, default: null },
      current_period_end: { type: Date, default: null },
      cancel_at_period_end: { type: Boolean, default: false },
      gateway_subscription_id: { type: String, default: null },
      gateway_customer_id: { type: String, default: null },
      amount_paid: { type: Number, default: 0 },
      currency: { type: String, default: "USD" }
    },
    ai_credits: {
      total_granted: { type: Number, default: 10 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 10 }
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Performance Indexes
UserSchema.index({ role: 1, is_active: 1 });
UserSchema.index({ created_at: -1 });

export const User = mongoose.model<IUser>("User", UserSchema);

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMarketplaceOrder extends Document {
  listing_id?: Types.ObjectId | null;
  presentation_id?: Types.ObjectId | null;
  title: string;
  seller_id: Types.ObjectId;
  buyer_id: Types.ObjectId;
  sale_price_pkr: number;
  platform_commission_pkr: number; // 5%
  seller_net_pkr: number;          // 95%
  currency: string;
  
  sale_status: "SALE_PENDING" | "SALE_CONFIRMED" | "DISPUTED" | "CANCELLED";
  commission_status:
    | "COMMISSION_DUE"
    | "COMMISSION_SUBMITTED"
    | "COMMISSION_UNDER_REVIEW"
    | "COMMISSION_PAID"
    | "COMMISSION_REJECTED"
    | "WAIVED";

  // Buyer payment to seller
  buyer_payment_method?: string | null;
  buyer_transaction_ref?: string | null;
  buyer_payment_proof?: string | null;
  buyer_confirmed_at?: Date | null;
  seller_confirmed_at?: Date | null;

  // Seller commission payment to platform
  commission_payment_ref?: string | null;
  commission_receipt_url?: string | null;
  commission_submitted_at?: Date | null;
  commission_verified_at?: Date | null;
  commission_verified_by?: Types.ObjectId | null;
  commission_rejection_reason?: string | null;

  // Dispute handling
  dispute_reason?: string | null;
  dispute_status?: "NONE" | "OPEN" | "RESOLVED";
  dispute_resolution_notes?: string | null;

  // Authorized downloads
  is_download_authorized: boolean;
  download_count: number;
  cloned_deck_id?: Types.ObjectId | null;

  created_at: Date;
  updated_at: Date;
}

const MarketplaceOrderSchema = new Schema<IMarketplaceOrder>(
  {
    listing_id: { type: Schema.Types.ObjectId, ref: "MarketplaceListing", default: null, index: true },
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", default: null, index: true },
    title: { type: String, required: true, trim: true },
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sale_price_pkr: { type: Number, required: true, min: 0 },
    platform_commission_pkr: { type: Number, required: true, min: 0 },
    seller_net_pkr: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },

    sale_status: {
      type: String,
      enum: ["SALE_PENDING", "SALE_CONFIRMED", "DISPUTED", "CANCELLED"],
      default: "SALE_PENDING",
      index: true
    },
    commission_status: {
      type: String,
      enum: [
        "COMMISSION_DUE",
        "COMMISSION_SUBMITTED",
        "COMMISSION_UNDER_REVIEW",
        "COMMISSION_PAID",
        "COMMISSION_REJECTED",
        "WAIVED"
      ],
      default: "COMMISSION_DUE",
      index: true
    },

    buyer_payment_method: { type: String, default: "Direct Transfer" },
    buyer_transaction_ref: { type: String, default: null },
    buyer_payment_proof: { type: String, default: null },
    buyer_confirmed_at: { type: Date, default: null },
    seller_confirmed_at: { type: Date, default: null },

    commission_payment_ref: { type: String, default: null },
    commission_receipt_url: { type: String, default: null },
    commission_submitted_at: { type: Date, default: null },
    commission_verified_at: { type: Date, default: null },
    commission_verified_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    commission_rejection_reason: { type: String, default: null },

    dispute_reason: { type: String, default: null },
    dispute_status: { type: String, enum: ["NONE", "OPEN", "RESOLVED"], default: "NONE" },
    dispute_resolution_notes: { type: String, default: null },

    is_download_authorized: { type: Boolean, default: false, index: true },
    download_count: { type: Number, default: 0 },
    cloned_deck_id: { type: Schema.Types.ObjectId, ref: "Presentation", default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

MarketplaceOrderSchema.index({ seller_id: 1, sale_status: 1 });
MarketplaceOrderSchema.index({ buyer_id: 1, sale_status: 1 });
MarketplaceOrderSchema.index({ commission_status: 1, created_at: -1 });

export const MarketplaceOrder = mongoose.model<IMarketplaceOrder>(
  "MarketplaceOrder",
  MarketplaceOrderSchema
);


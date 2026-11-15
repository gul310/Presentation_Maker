import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISellerPayoutLedger extends Document {
  seller_id: Types.ObjectId;
  marketplace_transaction_id: Types.ObjectId;
  presentation_id: Types.ObjectId;
  template_title: string;
  gross_sale_price: number;
  platform_commission: number; // 5% platform fee
  net_seller_proceeds: number; // 95% net seller earnings
  currency: string;
  payout_status: "pending" | "cleared" | "paid_out" | "refunded";
  payout_method?: string;
  payout_reference?: string;
  created_at: Date;
  updated_at: Date;
}

const SellerPayoutLedgerSchema = new Schema<ISellerPayoutLedger>(
  {
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    marketplace_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: "MarketplaceTransaction",
      required: true,
      index: true
    },
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", required: true },
    template_title: { type: String, required: true },
    gross_sale_price: { type: Number, required: true, min: 0 },
    platform_commission: { type: Number, required: true, min: 0 },
    net_seller_proceeds: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    payout_status: {
      type: String,
      enum: ["pending", "cleared", "paid_out", "refunded"],
      default: "cleared",
      index: true
    },
    payout_method: { type: String, default: "wallet_or_bank" },
    payout_reference: { type: String, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const SellerPayoutLedger = mongoose.model<ISellerPayoutLedger>(
  "SellerPayoutLedger",
  SellerPayoutLedgerSchema
);


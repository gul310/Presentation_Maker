import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMarketplaceTransaction extends Document {
  presentation_id: Types.ObjectId;
  template_title: string;
  seller_id: Types.ObjectId;
  buyer_id: Types.ObjectId;
  price: number;
  platform_commission: number; // 5% platform fee
  seller_earnings: number;     // 95% net earnings
  created_at: Date;
}

const MarketplaceTransactionSchema = new Schema<IMarketplaceTransaction>(
  {
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", required: true, index: true },
    template_title: { type: String, required: true },
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    platform_commission: { type: Number, required: true, min: 0 },
    seller_earnings: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false }
  }
);

export const MarketplaceTransaction = mongoose.model<IMarketplaceTransaction>("MarketplaceTransaction", MarketplaceTransactionSchema);

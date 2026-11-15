import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMarketplaceListing extends Document {
  seller_id: Types.ObjectId;
  presentation_id?: Types.ObjectId | null;
  title: string;
  short_description: string;
  detailed_description: string;
  category: string;
  tags: string[];
  price_pkr: number;
  cover_image_url?: string;
  preview_slides?: any[];
  file_type: "ai_deck" | "uploaded_pptx" | "uploaded_ppt";
  file_path?: string | null;
  file_name?: string | null;
  file_size_bytes?: number;
  ownership_confirmed: boolean;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ACTIVE";
  rejection_reason?: string | null;
  approved_at?: Date | null;
  approved_by?: Types.ObjectId | null;
  views_count: number;
  sales_count: number;
  created_at: Date;
  updated_at: Date;
}

const MarketplaceListingSchema = new Schema<IMarketplaceListing>(
  {
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", default: null, index: true },
    title: { type: String, required: true, trim: true, index: true },
    short_description: { type: String, required: true, trim: true },
    detailed_description: { type: String, default: "" },
    category: { type: String, default: "Education", index: true },
    tags: [{ type: String, trim: true }],
    price_pkr: { type: Number, required: true, min: 0, index: true },
    cover_image_url: { type: String, default: null },
    preview_slides: { type: Schema.Types.Mixed, default: [] },
    file_type: {
      type: String,
      enum: ["ai_deck", "uploaded_pptx", "uploaded_ppt"],
      default: "ai_deck",
      index: true
    },
    file_path: { type: String, default: null },
    file_name: { type: String, default: null },
    file_size_bytes: { type: Number, default: 0 },
    ownership_confirmed: { type: Boolean, required: true, default: true },
    status: {
      type: String,
      enum: ["PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED", "ACTIVE"],
      default: "PENDING_REVIEW",
      index: true
    },
    rejection_reason: { type: String, default: null },
    approved_at: { type: Date, default: null },
    approved_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    views_count: { type: Number, default: 0 },
    sales_count: { type: Number, default: 0, index: true }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

MarketplaceListingSchema.index({ status: 1, created_at: -1 });
MarketplaceListingSchema.index({ status: 1, category: 1 });
MarketplaceListingSchema.index({ status: 1, sales_count: -1 });

export const MarketplaceListing = mongoose.model<IMarketplaceListing>(
  "MarketplaceListing",
  MarketplaceListingSchema
);


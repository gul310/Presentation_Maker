import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITemplateSlide {
  slide_number: number;
  title: string;
  content: string[];
  layout_type: string;
  speaker_notes?: string;
  image_url?: string;
  source_reference?: string;
}

export interface ITemplateReview {
  user_id: Types.ObjectId;
  user_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: Date;
}

export type TemplateCategory =
  | "Business & Corporate"
  | "Education & University"
  | "Technology & AI"
  | "Healthcare"
  | "Marketing"
  | "Research & Academic"
  | "Portfolio & Creative"
  | "Pitch Decks";

export type TemplateAccessType = "FREE" | "PLAN_INCLUDED" | "PREMIUM";

export interface ITemplate extends Document {
  title: string;
  description: string;
  category: TemplateCategory;
  cover_image: string;
  preview_images: string[];
  access_type: TemplateAccessType;
  price_pkr: number;
  price_usd: number;
  applicable_plans: string[];
  slide_count: number;
  slides: ITemplateSlide[];
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  usage_count: number;
  purchase_count: number;
  average_rating: number;
  ratings_count: number;
  reviews: ITemplateReview[];
  created_by?: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const TemplateSlideSchema = new Schema<ITemplateSlide>(
  {
    slide_number: { type: Number, required: true },
    title: { type: String, required: true },
    content: [{ type: String }],
    layout_type: { type: String, default: "title_and_body" },
    speaker_notes: { type: String, default: "" },
    image_url: { type: String, default: null },
    source_reference: { type: String, default: "" }
  },
  { _id: false }
);

const TemplateReviewSchema = new Schema<ITemplateReview>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user_name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    created_at: { type: Date, default: Date.now }
  },
  { _id: true }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "Business & Corporate",
        "Education & University",
        "Technology & AI",
        "Healthcare",
        "Marketing",
        "Research & Academic",
        "Portfolio & Creative",
        "Pitch Decks"
      ],
      index: true
    },
    cover_image: { type: String, default: "https://images.unsplash.com/photo-1498050108023-c5249f4df085" },
    preview_images: [{ type: String }],
    access_type: {
      type: String,
      enum: ["FREE", "PLAN_INCLUDED", "PREMIUM"],
      default: "FREE",
      index: true
    },
    price_pkr: { type: Number, default: 0, min: 0 },
    price_usd: { type: Number, default: 0, min: 0 },
    applicable_plans: {
      type: [String],
      default: ["student", "pro", "team"]
    },
    slide_count: { type: Number, default: 0 },
    slides: [TemplateSlideSchema],
    tags: [{ type: String }],
    is_published: { type: Boolean, default: true, index: true },
    is_featured: { type: Boolean, default: false, index: true },
    usage_count: { type: Number, default: 0, min: 0 },
    purchase_count: { type: Number, default: 0, min: 0 },
    average_rating: { type: Number, default: 5.0, min: 0, max: 5 },
    ratings_count: { type: Number, default: 1, min: 0 },
    reviews: [TemplateReviewSchema],
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const Template = mongoose.model<ITemplate>("Template", TemplateSchema);


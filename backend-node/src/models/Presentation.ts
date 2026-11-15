import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISlideImage {
  provider: "unsplash" | "custom" | string;
  photo_id: string;
  url: string;
  regular_url?: string;
  small_url?: string;
  thumb_url?: string;
  download_location?: string;
  photographer_name: string;
  photographer_profile_url: string;
  photo_page_url: string;
  alt_text?: string;
  width?: number;
  height?: number;
  orientation?: "landscape" | "portrait" | "squarish";
  position?: "hero" | "split_left" | "split_right" | "card" | "background";
  selection_reason?: string;
  selected_at?: Date;
}

export interface ISlide {
  _id?: Types.ObjectId;
  slide_number: number;
  title: string;
  content: {
    subtitle?: string;
    bullet_points?: string[];
    body?: string;
    image?: ISlideImage;
    [key: string]: any;
  };
  image?: ISlideImage;
  layout_type: string;
  speaker_notes?: string;
  source_reference?: string;
  translations?: Record<string, {
    title: string;
    content: any;
    speaker_notes?: string;
  }>;
  created_at?: Date;
  updated_at?: Date;
}

export interface IPresentation extends Document {
  user_id?: Types.ObjectId | null;
  guest_session_id?: string | null;
  title: string;
  source_type: "prompt" | "document";
  source_name?: string | null;
  language: string;
  preferred_language: string;
  audience?: string | null;
  presentation_type?: string | null;
  tone?: string | null;
  slide_count: number;
  status: "draft" | "ready" | "processing";
  
  // Public Sharing & Templates
  visibility: "private" | "public";
  is_template: boolean;
  original_presentation_id?: Types.ObjectId | null;
  
  // Real Ranking & Discovery Signals
  views_count: number;
  template_use_count: number;
  average_rating: number;
  ratings_count: number;
  reviews_count: number;
  
  // Marketplace Attributes
  marketplace: {
    is_for_sale: boolean;
    price: number;
    sales_count: number;
    published_at?: Date | null;
  };

  theme?: any;
  slides: ISlide[];
  created_at: Date;
  updated_at: Date;
}

const SlideSchema = new Schema<ISlide>(
  {
    slide_number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: Schema.Types.Mixed, default: {} },
    image: {
      provider: { type: String, default: "unsplash" },
      photo_id: { type: String },
      url: { type: String },
      regular_url: { type: String },
      small_url: { type: String },
      thumb_url: { type: String },
      download_location: { type: String },
      photographer_name: { type: String },
      photographer_profile_url: { type: String },
      photo_page_url: { type: String },
      alt_text: { type: String },
      width: { type: Number },
      height: { type: Number },
      orientation: { type: String, default: "landscape" },
      position: { type: String, default: "split_right" },
      selection_reason: { type: String },
      selected_at: { type: Date, default: Date.now }
    },
    layout_type: { type: String, default: "standard" },
    speaker_notes: { type: String, default: "" },
    source_reference: { type: String, default: null },
    translations: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

const PresentationSchema = new Schema<IPresentation>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    guest_session_id: { type: String, index: true, default: null },
    title: { type: String, required: true, trim: true },
    source_type: { type: String, enum: ["prompt", "document"], required: true },
    source_name: { type: String, default: null },
    language: { type: String, default: "English" },
    preferred_language: { type: String, default: "English" },
    audience: { type: String, default: "General" },
    presentation_type: { type: String, default: "Informative" },
    tone: { type: String, default: "Professional" },
    slide_count: { type: Number, default: 0 },
    status: { type: String, default: "ready" },
    
    visibility: { type: String, enum: ["private", "public"], default: "private", index: true },
    is_template: { type: Boolean, default: false, index: true },
    original_presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", default: null },
    
    views_count: { type: Number, default: 0, index: true },
    template_use_count: { type: Number, default: 0, index: true },
    average_rating: { type: Number, default: 0, index: true },
    ratings_count: { type: Number, default: 0 },
    reviews_count: { type: Number, default: 0 },
    
    marketplace: {
      is_for_sale: { type: Boolean, default: false, index: true },
      price: { type: Number, default: 0 },
      sales_count: { type: Number, default: 0 },
      published_at: { type: Date, default: null }
    },
    
    theme: { type: Schema.Types.Mixed, default: null },
    slides: [SlideSchema]
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Indexes for fast user queries and ranking
PresentationSchema.index({ user_id: 1, created_at: -1 });
PresentationSchema.index({ guest_session_id: 1, created_at: -1 });
PresentationSchema.index({ visibility: 1, average_rating: -1, ratings_count: -1 });
PresentationSchema.index({ visibility: 1, views_count: -1 });
PresentationSchema.index({ visibility: 1, template_use_count: -1 });
PresentationSchema.index({ visibility: 1, created_at: -1 });

export const Presentation = mongoose.model<IPresentation>("Presentation", PresentationSchema);

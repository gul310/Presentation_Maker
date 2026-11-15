import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGenerationJob extends Document {
  user_id?: Types.ObjectId | null;
  guest_session_id?: string | null;
  prompt: string;
  custom_prompt?: string | null;
  source_type: string;
  source_name?: string | null;
  slide_count: number;
  language: string;
  audience?: string | null;
  presentation_type?: string | null;
  tone?: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  progress_stage: "preparing" | "generating" | "layouts" | "images" | "saving" | "completed" | "failed";
  progress_message: string;
  presentation_id?: Types.ObjectId | null;
  error_message?: string | null;
  error_code?: string | null;
  created_at: Date;
  updated_at: Date;
}

const GenerationJobSchema = new Schema<IGenerationJob>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guest_session_id: { type: String, default: null, index: true },
    prompt: { type: String, required: true },
    custom_prompt: { type: String, default: null },
    source_type: { type: String, default: "prompt" },
    source_name: { type: String, default: null },
    slide_count: { type: Number, default: 6 },
    language: { type: String, default: "English" },
    audience: { type: String, default: "General" },
    presentation_type: { type: String, default: "Informative" },
    tone: { type: String, default: "Professional" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    progress_stage: {
      type: String,
      enum: ["preparing", "generating", "layouts", "images", "saving", "completed", "failed"],
      default: "preparing",
    },
    progress_message: {
      type: String,
      default: "Preparing your presentation...",
    },
    presentation_id: {
      type: Schema.Types.ObjectId,
      ref: "Presentation",
      default: null,
    },
    error_message: { type: String, default: null },
    error_code: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index to quickly find recent active duplicate jobs
GenerationJobSchema.index({ prompt: 1, user_id: 1, guest_session_id: 1, created_at: -1 });

export const GenerationJob = mongoose.model<IGenerationJob>("GenerationJob", GenerationJobSchema);


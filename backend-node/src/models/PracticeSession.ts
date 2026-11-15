import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPracticeSlideResult {
  slide_id?: Types.ObjectId | string;
  slide_number: number;
  title?: string;
  transcript: string;
  duration_seconds: number;
  words_spoken: number;
  words_per_minute: number;
  completion_status: "completed" | "skipped";
  score?: number | null;
  feedback?: any;
}

export interface IPracticeSession extends Document {
  user_id?: Types.ObjectId | null;
  guest_session_id?: string | null;
  presentation_id: Types.ObjectId;
  presentation_title?: string;
  started_at: Date;
  completed_at?: Date | null;
  duration_seconds: number;
  total_slides: number;
  completed_slides: number;
  status: "in_progress" | "completed" | "cancelled";
  overall_score?: number | null;
  slide_results: IPracticeSlideResult[];
  report?: {
    overall_score?: number;
    strengths?: string[];
    areas_for_improvement?: string[];
    summary?: string;
    wpm_average?: number;
    total_time_seconds?: number;
    slide_evaluations?: any[];
  };
  created_at: Date;
  updated_at: Date;
}

const PracticeSlideResultSchema = new Schema<IPracticeSlideResult>(
  {
    slide_id: { type: Schema.Types.Mixed },
    slide_number: { type: Number, required: true },
    title: { type: String, default: "" },
    transcript: { type: String, default: "" },
    duration_seconds: { type: Number, default: 0 },
    words_spoken: { type: Number, default: 0 },
    words_per_minute: { type: Number, default: 0 },
    completion_status: { type: String, enum: ["completed", "skipped"], default: "skipped" },
    score: { type: Number, default: null },
    feedback: { type: Schema.Types.Mixed, default: null }
  },
  { _id: true }
);

const PracticeSessionSchema = new Schema<IPracticeSession>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    guest_session_id: { type: String, index: true, default: null },
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", required: true, index: true },
    presentation_title: { type: String, default: "" },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    duration_seconds: { type: Number, default: 0 },
    total_slides: { type: Number, default: 0 },
    completed_slides: { type: Number, default: 0 },
    status: { type: String, enum: ["in_progress", "completed", "cancelled"], default: "in_progress" },
    overall_score: { type: Number, default: null },
    slide_results: [PracticeSlideResultSchema],
    report: { type: Schema.Types.Mixed, default: null }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const PracticeSession = mongoose.model<IPracticeSession>("PracticeSession", PracticeSessionSchema);

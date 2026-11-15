import mongoose, { Document, Schema } from "mongoose";

export interface IGuestSession extends Document {
  session_id: string;
  generation_count: number;
  created_at: Date;
  updated_at: Date;
}

const GuestSessionSchema = new Schema<IGuestSession>(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    generation_count: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const GuestSession = mongoose.model<IGuestSession>("GuestSession", GuestSessionSchema);

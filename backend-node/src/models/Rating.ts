import mongoose, { Document, Schema, Types } from "mongoose";

export interface IRating extends Document {
  presentation_id: Types.ObjectId;
  user_id: Types.ObjectId;
  score: number; // 1 to 5
  created_at: Date;
  updated_at: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Prevent duplicate ratings by the same user on the same presentation
RatingSchema.index({ presentation_id: 1, user_id: 1 }, { unique: true });

export const Rating = mongoose.model<IRating>("Rating", RatingSchema);

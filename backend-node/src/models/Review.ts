import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReview extends Document {
  presentation_id: Types.ObjectId;
  user_id: Types.ObjectId;
  user_name: string;
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    presentation_id: { type: Schema.Types.ObjectId, ref: "Presentation", required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user_name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

export const Review = mongoose.model<IReview>("Review", ReviewSchema);

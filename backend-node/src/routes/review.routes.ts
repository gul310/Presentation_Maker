import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Review } from "../models/Review.js";
import { Presentation } from "../models/Presentation.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// Submit a real review for a public presentation
router.post(["/", "/:id"], requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const presentation_id = req.body.presentation_id || getParam(req.params.id);
    const { rating, comment } = req.body;
    const user = req.auth!.user!;

    if (!presentation_id || !Types.ObjectId.isValid(presentation_id)) {
      res.status(400).json({ detail: "Valid presentation_id is required." });
      return;
    }

    if (!comment || !comment.trim()) {
      res.status(400).json({ detail: "Review comment cannot be empty." });
      return;
    }

    const numRating = Number(rating) || 5;
    if (numRating < 1 || numRating > 5) {
      res.status(400).json({ detail: "Rating must be between 1 and 5." });
      return;
    }

    const presentation = await Presentation.findById(presentation_id);
    if (!presentation || presentation.visibility !== "public") {
      res.status(404).json({ detail: "Public presentation not found." });
      return;
    }

    const review = new Review({
      presentation_id: new Types.ObjectId(presentation_id),
      user_id: user._id,
      user_name: user.name,
      rating: numRating,
      comment: comment.trim()
    });

    await review.save();

    const reviewCount = await Review.countDocuments({ presentation_id: new Types.ObjectId(presentation_id) });
    presentation.reviews_count = reviewCount;
    await presentation.save();

    const reviewObj = review.toObject();
    res.status(201).json({
      ...reviewObj,
      id: review._id.toString(),
      review: {
        ...reviewObj,
        id: review._id.toString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit review." });
  }
});

// Get real reviews for a presentation
router.get("/:presentationId", async (req: Request, res: Response): Promise<void> => {
  try {
    const presentationId = getParam(req.params.presentationId);
    if (!Types.ObjectId.isValid(presentationId)) {
      res.status(400).json({ detail: "Invalid presentationId." });
      return;
    }

    const reviews = await Review.find({ presentation_id: new Types.ObjectId(presentationId) })
      .sort({ created_at: -1 })
      .lean();

    const formatted = reviews.map(r => ({
      ...r,
      id: r._id.toString(),
      user_id: r.user_id.toString()
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch reviews." });
  }
});

export default router;
